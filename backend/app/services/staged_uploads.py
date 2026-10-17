"""Preparaciones: un PDF subido una sola vez que se lee mientras la persona revisa el formulario.

Al elegir el PDF, `prepare_stage` lo analiza (para rellenar el formulario), dibuja su portada y
empieza a extraer su texto en segundo plano. Cuando se envía el formulario, `POST /books/upload`
solo trae los datos y el `stage_id`: el texto ya está leído y solo falta guardarlo
(ver docs/adr/0010-subida-unica-con-preparacion.md).

El PDF solo se conserva en memoria hasta terminar la lectura; después queda el texto extraído y
la portada, durante `STAGE_TTL_MINUTES`. Cada usuario tiene una sola preparación: preparar otro
PDF descarta la anterior. Como en `upload_jobs`, el registro vive en este proceso.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
import uuid
from typing import Callable

from ..config import get_limits
from ..errors import AppError
from . import pdf_worker
from .pdf_text import extract_pdf_pages, raise_if_error, run_in_pool

log = logging.getLogger("app")

READING, READY, ERROR = "leyendo", "listo", "error"

#: Una página con menos caracteres que estos (un número de página, un pie de foto) cuenta como "sin texto".
MIN_PAGE_CHARS = 25

Progress = Callable[[dict], None]

_stages: dict[str, dict] = {}
#: id del usuario -> id de su preparación vigente
_by_owner: dict[str, str] = {}
_semaphore: tuple[asyncio.AbstractEventLoop, asyncio.Semaphore] | None = None


def _read_slots() -> asyncio.Semaphore:
    """Límite de PDF que se leen a la vez (`UPLOAD_CONCURRENCY`), como en las cargas directas."""
    global _semaphore
    loop = asyncio.get_running_loop()
    if _semaphore is None or _semaphore[0] is not loop:
        _semaphore = (loop, asyncio.Semaphore(get_limits().concurrency))
    return _semaphore[1]


def _not_found() -> AppError:
    return AppError(404, "STAGE_NOT_FOUND", "El PDF preparado ya no está disponible. Vuelve a elegir el archivo.")


def _remove(stage: dict) -> None:
    """Quita una preparación del registro y detiene su lectura si seguía en curso."""
    _stages.pop(stage["id"], None)
    if _by_owner.get(stage["owner"]) == stage["id"]:
        del _by_owner[stage["owner"]]
    task = stage.get("task")
    if task and not task.done():
        task.cancel()
    stage["pdf"] = None


def _sweep_expired() -> None:
    now = time.monotonic()
    for stage in list(_stages.values()):
        if stage["expira"] <= now:
            _remove(stage)


def _notify(stage: dict, progress: dict) -> None:
    stage["progreso"] = progress
    for listener in list(stage["listeners"]):
        listener(progress)


async def _read_text(stage: dict) -> None:
    """Extrae el texto del PDF y deja el resultado (o el error) en la preparación."""
    try:
        async with _read_slots():
            pages = await extract_pdf_pages(stage["pdf"], on_progress=lambda p: _notify(stage, p))
        stage["paginas"] = pages
        stage["estado"] = READY
    except asyncio.CancelledError:
        raise
    except AppError as error:
        stage["estado"] = ERROR
        stage["error"] = {"status": error.status, "code": error.code, "message": error.message, **error.extra}
    except Exception:  # noqa: BLE001
        log.exception("Fallo al leer el PDF preparado")
        stage["estado"] = ERROR
        stage["error"] = {"status": 500, "code": "STORAGE_ERROR", "message": "No se pudo leer el PDF. Inténtalo de nuevo."}
    finally:
        stage["pdf"] = None
        stage["done"].set()


async def prepare_stage(owner: str, data: bytes) -> dict:
    """Prepara un PDF: lo analiza, dibuja su portada y empieza a leer su texto en segundo plano.

    Devuelve la preparación (ver `to_public_stage`) con `analisis` y `portada` ya calculados.
    Descarta la preparación anterior del usuario. Lanza `AppError` si el PDF no se puede abrir
    (`CORRUPT_PDF`, `PDF_ENCRYPTED`).
    """
    _sweep_expired()
    previous = _stages.get(_by_owner.get(owner, ""))
    if previous:
        _remove(previous)

    stage = {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "hash": None,
        "estado": READING,
        "progreso": {"paginas_procesadas": 0, "total_paginas": None},
        "analisis": None,
        "portada": None,
        "paginas": None,
        "error": None,
        "pdf": data,
        "listeners": [],
        "done": asyncio.Event(),
        "expira": time.monotonic() + get_limits().stage_ttl_seconds,
    }
    _stages[stage["id"]] = stage
    _by_owner[owner] = stage["id"]
    stage["task"] = asyncio.get_running_loop().create_task(_read_text(stage))

    try:
        stage["hash"], result = await asyncio.gather(
            asyncio.to_thread(lambda: hashlib.sha256(data).hexdigest()),
            run_in_pool(pdf_worker.analyze_and_cover, data),
        )
        result = raise_if_error(result)
    except BaseException:
        _remove(stage)
        raise
    stage["analisis"] = result["data"]
    if result["cover"]:
        stage["portada"] = {"data": result["cover"], "mime": "image/jpeg"}
    return stage


def get_stage(stage_id: str, owner: str, *, refresh: bool = False) -> dict:
    """Preparación vigente de `owner`. Lanza `STAGE_NOT_FOUND` (404) si no existe, caducó o es de otro usuario.
    Con `refresh` alarga su vida otro `STAGE_TTL_MINUTES` (al enviar el formulario)."""
    _sweep_expired()
    stage = _stages.get(stage_id)
    if not stage or stage["owner"] != owner:
        raise _not_found()
    if refresh:
        stage["expira"] = time.monotonic() + get_limits().stage_ttl_seconds
    return stage


def stage_error(stage: dict) -> AppError | None:
    """El `AppError` con que falló la lectura del PDF (`CORRUPT_PDF`, `NO_EXTRACTABLE_TEXT`...), o `None`."""
    if stage["estado"] != ERROR:
        return None
    error = dict(stage["error"])
    return AppError(error.pop("status"), error.pop("code"), error.pop("message"), **error)


def discard_stage(stage_id: str, owner: str) -> None:
    """Descarta una preparación (el usuario cambió de archivo o canceló). No falla si ya no existe."""
    stage = _stages.get(stage_id)
    if stage and stage["owner"] == owner:
        _remove(stage)


def finish_stage(stage: dict) -> None:
    """La preparación ya se guardó como libro: suelta el texto y la portada."""
    _remove(stage)


async def wait_pages(stage: dict, on_progress: Progress) -> list[dict]:
    """Espera a que termine la lectura del texto y lo devuelve (`[{"pagina", "texto"}, ...]`).

    `on_progress` recibe el avance de la lectura (también si ya terminó). Si la lectura falló,
    lanza el mismo `AppError` que habría dado la carga directa.
    """
    on_progress(stage["progreso"])
    stage["listeners"].append(on_progress)
    try:
        await stage["done"].wait()
    finally:
        if on_progress in stage["listeners"]:
            stage["listeners"].remove(on_progress)
    failure = stage_error(stage)
    if failure:
        raise failure
    if stage["estado"] != READY:  # se descartó o caducó mientras se esperaba
        raise _not_found()
    return stage["paginas"]


def to_public_stage(stage: dict) -> dict:
    """Estado público de una preparación (sin PDF, texto, hash ni dueño). Cuando el texto ya está
    leído incluye `paginasSinTexto`, el número de páginas con menos de `MIN_PAGE_CHARS` caracteres."""
    data = {"stageId": stage["id"], "estado": stage["estado"], "progreso": stage["progreso"]}
    if stage["paginas"] is not None:
        # Páginas con casi nada de texto (imágenes o en blanco): el cliente avisa si son muchas.
        data["paginasSinTexto"] = sum(1 for page in stage["paginas"] if len(page["texto"].strip()) < MIN_PAGE_CHARS)
    if stage["error"]:
        data["error"] = {k: v for k, v in stage["error"].items() if k != "status"}
    return data


def reset_stages() -> None:
    """Vacía el registro y detiene las lecturas en curso. Solo para pruebas."""
    for stage in list(_stages.values()):
        _remove(stage)
    _stages.clear()
    _by_owner.clear()
