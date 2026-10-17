"""Lectura del texto de un PDF, lo más rápida posible.

- El trabajo pesado (PyMuPDF) corre en un **pool de procesos** persistente, así el bucle de
  asyncio nunca se bloquea y varias cargas se leen en paralelo.
- Un PDF grande (>= `PDF_PARALLEL_MIN_PAGES`) se parte en bloques de páginas que leen
  procesos distintos a la vez; el progreso se actualiza cada vez que termina un bloque.
- Un PDF pequeño se lee entero en una sola llamada al pool.
"""

from __future__ import annotations

import asyncio
import math
from concurrent.futures import ProcessPoolExecutor
from typing import Callable

from ..config import get_limits
from ..errors import AppError
from . import pdf_worker

Progress = Callable[[dict], None]

_pool: ProcessPoolExecutor | None = None


def get_pool() -> ProcessPoolExecutor:
    """Pool de procesos compartido (se crea la primera vez que se necesita)."""
    global _pool
    if _pool is None:
        _pool = ProcessPoolExecutor(max_workers=get_limits().pdf_workers, initializer=pdf_worker.init_worker)
    return _pool


async def warm_up_pool() -> None:
    """Arranca todos los procesos del pool (en Windows crear un proceso tarda; mejor al iniciar)."""
    loop = asyncio.get_running_loop()
    pool = get_pool()
    await asyncio.gather(*(loop.run_in_executor(pool, pdf_worker.warm_up) for _ in range(get_limits().pdf_workers)))


def shutdown_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.shutdown(wait=False, cancel_futures=True)
        _pool = None


async def run_in_pool(func, *args):
    return await asyncio.get_running_loop().run_in_executor(get_pool(), func, *args)


def raise_if_error(result: dict) -> dict:
    """Convierte el error devuelto por un proceso trabajador en `AppError`."""
    err = result.get("error")
    if err:
        raise AppError(err["status"], err["code"], err["message"])
    return result


def looks_like_pdf(data: bytes) -> bool:
    """Cabecera `%PDF-` en el primer KB (puede haber algo de basura antes)."""
    return len(data) > 0 and b"%PDF-" in data[:1024]


def _share(data: bytes):
    """Copia `data` a memoria compartida; `None` si el sistema no lo permite."""
    from multiprocessing import shared_memory

    try:
        shm = shared_memory.SharedMemory(create=True, size=len(data))
    except Exception:  # noqa: BLE001
        return None
    shm.buf[: len(data)] = data
    return shm


def _split(total: int, parts: int) -> list[tuple[int, int]]:
    """Reparte las páginas 1..total en bloques contiguos `(inicio, fin)` de tamaño parecido."""
    size = max(1, math.ceil(total / parts))
    return [(start, min(start + size - 1, total)) for start in range(1, total + 1, size)]


async def extract_pdf_pages(
    data: bytes,
    *,
    max_pages: int | None = None,
    max_content_bytes: int | None = None,
    on_progress: Progress | None = None,
) -> list[dict]:
    """Texto de cada página de un PDF, en orden: `[{"pagina": 1, "texto": "..."}, ...]`.

    Siempre devuelve una entrada por página (1..N), también las vacías.

    Lanza `AppError`: `CORRUPT_PDF`, `PDF_ENCRYPTED`, `TOO_MANY_PAGES`, `NO_EXTRACTABLE_TEXT`
    o `CONTENT_TOO_LARGE`.
    """
    limits = get_limits()
    max_pages = max_pages if max_pages is not None else limits.max_pdf_pages
    max_bytes = max_content_bytes if max_content_bytes is not None else limits.max_content_bytes

    first = raise_if_error(
        await run_in_pool(pdf_worker.probe_or_extract, data, max_pages, limits.parallel_min_pages, max_bytes)
    )
    total = first["total"]
    if on_progress:
        on_progress({"paginas_procesadas": 0, "total_paginas": total})

    if "pages" in first:
        collected = first["pages"]
        if on_progress:
            on_progress({"paginas_procesadas": total, "total_paginas": total})
    else:
        # PDF grande: bloques de páginas repartidos entre los procesos (varios por proceso,
        # para equilibrar la carga y dar un progreso más fino).
        ranges = _split(total, limits.pdf_workers * 4)
        done = 0
        collected = []
        # El PDF se copia una sola vez a memoria compartida; cada proceso lo abre desde ahí.
        shm = _share(data)
        if shm is not None:
            args = lambda start, end: (pdf_worker.extract_range_shared, shm.name, len(data), start, end, max_bytes)  # noqa: E731
        else:
            args = lambda start, end: (pdf_worker.extract_range, data, start, end, max_bytes)  # noqa: E731
        tasks = [asyncio.ensure_future(run_in_pool(*args(start, end))) for start, end in ranges]
        try:
            for finished in asyncio.as_completed(tasks):
                part = raise_if_error(await finished)
                collected.extend(part["pages"])
                done += len(part["pages"])
                if on_progress:
                    on_progress({"paginas_procesadas": done, "total_paginas": total})
        except BaseException:
            for task in tasks:
                task.cancel()
            raise
        finally:
            if shm is not None:
                # Se espera a las tareas que sigan en curso antes de liberar la memoria.
                await asyncio.gather(*tasks, return_exceptions=True)
                shm.close()
                shm.unlink()

    collected.sort(key=lambda item: item[0])
    if sum(len(text.encode("utf-8")) for _, text in collected) > max_bytes:
        raise AppError(
            422, "CONTENT_TOO_LARGE", "El texto extraído es demasiado grande para guardarse en un solo libro."
        )
    if not any(text.strip() for _, text in collected):
        raise AppError(
            422,
            "NO_EXTRACTABLE_TEXT",
            "El PDF no contiene texto extraíble (parece estar escaneado como imágenes).",
        )
    return [{"pagina": number, "texto": text} for number, text in collected]
