"""Registro en memoria de las cargas de libros: cola con concurrencia limitada, estado y progreso.

Los trabajos viven en este proceso (por eso el servidor corre con un solo proceso uvicorn) y se
conservan `JOB_TTL_MINUTES` después de terminar.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import deque
from typing import Any, Awaitable, Callable

from ..config import get_limits
from ..errors import AppError

log = logging.getLogger("app")

PENDING, PROCESSING, DONE, ERROR = "pendiente", "procesando", "completado", "error"

Task = Callable[[Any, Callable[[dict], None]], Awaitable[dict]]

_jobs: dict[str, dict] = {}
#: `usuario:hash` -> id del trabajo (reintentos idempotentes)
_hash_index: dict[str, str] = {}
#: clave de título -> id del trabajo activo (cargas simultáneas del mismo libro)
_title_index: dict[str, str] = {}
_queue: deque[dict] = deque()
_running = 0
#: Referencias a las tareas en curso para que no las recoja el recolector de basura.
_tasks: set[asyncio.Task] = set()


def _is_active(job: dict) -> bool:
    return job["estado"] in (PENDING, PROCESSING)


def _sweep_expired() -> None:
    """Elimina los trabajos terminados cuyo TTL venció."""
    now = time.monotonic()
    for job in list(_jobs.values()):
        if not _is_active(job) and job["expira"] <= now:
            del _jobs[job["id"]]
            if _hash_index.get(job["hash_key"]) == job["id"]:
                del _hash_index[job["hash_key"]]


def _drain() -> None:
    """Arranca trabajos de la cola respetando el límite de concurrencia."""
    global _running
    while _running < get_limits().concurrency and _queue:
        job = _queue.popleft()
        _running += 1
        task = asyncio.get_running_loop().create_task(_run_job(job))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)


async def _run_job(job: dict) -> None:
    """Ejecuta un trabajo y deja registrado su resultado. Al terminar suelta el PDF de memoria."""
    global _running
    job["estado"] = PROCESSING
    started = time.monotonic()

    def on_progress(progress: dict) -> None:
        job["progreso"] = progress

    try:
        result = await job["task"](job["payload"], on_progress)
        job["libro_id"] = result["libro_id"]
        job["estado"] = DONE
    except AppError as error:
        job["estado"] = ERROR
        job["error"] = {"code": error.code, "message": error.message, **error.extra}
    except Exception:  # noqa: BLE001
        log.exception("Fallo al procesar la carga")
        job["estado"] = ERROR
        job["error"] = {"code": "STORAGE_ERROR", "message": "No se pudo guardar el libro. Inténtalo de nuevo."}
    finally:
        job["payload"] = None
        job["task"] = None
        job["duracion_ms"] = round((time.monotonic() - started) * 1000)
        job["expira"] = time.monotonic() + get_limits().job_ttl_seconds
        if _title_index.get(job["title_key"]) == job["id"]:
            del _title_index[job["title_key"]]
        _running -= 1
        _drain()


def enqueue_upload(*, owner: str, hash: str, title_key: str, payload: Any, task: Task) -> tuple[dict, bool]:
    """Encola la carga de un libro. Devuelve `(trabajo, reutilizado)`.

    Si el mismo usuario ya envió el mismo archivo (mismo hash) y esa carga no falló, devuelve el
    trabajo existente en lugar de crear otro (reintentos accidentales). Si ya hay una carga
    activa con el mismo título lanza `DUPLICATE_BOOK` (409).
    """
    _sweep_expired()

    hash_key = f"{owner}:{hash}"
    existing = _jobs.get(_hash_index.get(hash_key, ""))
    if existing and existing["estado"] != ERROR:
        return existing, True

    if title_key in _title_index:
        raise AppError(409, "DUPLICATE_BOOK", "Ya se está procesando una carga de un libro con ese título.")

    job = {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "hash_key": hash_key,
        "title_key": title_key,
        "estado": PENDING,
        "progreso": {"paginas_procesadas": 0, "total_paginas": None},
        "libro_id": None,
        "error": None,
        "duracion_ms": None,
        "expira": float("inf"),
        "payload": payload,
        "task": task,
    }
    _jobs[job["id"]] = job
    _hash_index[hash_key] = job["id"]
    _title_index[title_key] = job["id"]
    _queue.append(job)
    # Se difiere para que la respuesta a quien subió el libro refleje 'pendiente'.
    asyncio.get_running_loop().call_soon(_drain)
    return job, False


def get_job(job_id: str) -> dict | None:
    """Busca un trabajo por id (`None` si no existe o expiró)."""
    job = _jobs.get(job_id)
    if job and not _is_active(job) and job["expira"] <= time.monotonic():
        del _jobs[job_id]
        return None
    return job


def to_public_job(job: dict) -> dict:
    """Representación pública de un trabajo (sin PDF, hash ni dueño)."""
    data = {"jobId": job["id"], "estado": job["estado"], "progreso": job["progreso"]}
    if job["libro_id"]:
        data["libro_id"] = job["libro_id"]
    if job["error"]:
        data["error"] = job["error"]
    if job["duracion_ms"] is not None:
        data["duracion_ms"] = job["duracion_ms"]
    return data


def reset_jobs() -> None:
    """Vacía el registro y la cola. Solo para pruebas."""
    global _running
    _jobs.clear()
    _hash_index.clear()
    _title_index.clear()
    _queue.clear()
    _running = 0
