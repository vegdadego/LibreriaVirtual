"""Subida de un PDF grande por fragmentos (ver docs/adr/0012-paginas-aparte-y-subida-por-fragmentos.md).

El navegador parte el archivo en fragmentos de `UPLOAD_CHUNK_KB` (4 MB por defecto) y los manda
con varias peticiones a la vez. Cada fragmento es un cuerpo binario simple: no pasa por el análisis
de `multipart/form-data`, un fallo de red solo obliga a repetir ese fragmento y el cliente tiene
un avance real. Cuando llegan todos, el servidor une el PDF y lo prepara igual que `POST /books/stage`.

Como `staged_uploads`, el registro vive en este proceso; cada usuario tiene una sola subida en curso
(empezar otra descarta la anterior) y las abandonadas caducan a los `STAGE_TTL_MINUTES`.
"""

from __future__ import annotations

import math
import time
import uuid

from ..config import get_limits
from ..errors import AppError
from .pdf_text import looks_like_pdf

_uploads: dict[str, dict] = {}
#: id del usuario -> id de su subida en curso
_by_owner: dict[str, str] = {}


def _not_found() -> AppError:
    return AppError(404, "UPLOAD_NOT_FOUND", "La subida ya no está disponible. Vuelve a elegir el archivo.")


def _remove(upload: dict) -> None:
    _uploads.pop(upload["id"], None)
    if _by_owner.get(upload["owner"]) == upload["id"]:
        del _by_owner[upload["owner"]]
    upload["buffer"] = None


def _sweep_expired() -> None:
    now = time.monotonic()
    for upload in list(_uploads.values()):
        if upload["expira"] <= now:
            _remove(upload)


def start_upload(owner: str, name: str, size: int) -> dict:
    """Abre una subida por fragmentos de un archivo de `size` bytes y descarta la anterior del usuario.

    Lanza `FILE_TOO_LARGE` (413) si no cabe e `INVALID_UPLOAD` (400) si el tamaño no es válido.
    """
    _sweep_expired()
    limits = get_limits()
    if not isinstance(size, int) or isinstance(size, bool) or size < 1:
        raise AppError(400, "INVALID_UPLOAD", 'Indica el tamaño del archivo en "tamano" (bytes).')
    if size > limits.max_pdf_bytes:
        raise AppError(413, "FILE_TOO_LARGE", "El PDF supera el tamaño máximo permitido.")

    previous = _uploads.get(_by_owner.get(owner, ""))
    if previous:
        _remove(previous)

    upload = {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "nombre": str(name or "")[:255],
        "size": size,
        "chunk": limits.chunk_bytes,
        "total": math.ceil(size / limits.chunk_bytes),
        "received": set(),
        # Reservado de una vez: cada fragmento se copia en su sitio, sin juntar listas al final.
        "buffer": bytearray(size),
        "expira": time.monotonic() + limits.stage_ttl_seconds,
    }
    _uploads[upload["id"]] = upload
    _by_owner[owner] = upload["id"]
    return upload


def get_upload(upload_id: str, owner: str) -> dict:
    """Subida en curso de `owner`. Lanza `UPLOAD_NOT_FOUND` (404) si no existe, caducó o es de otro usuario."""
    _sweep_expired()
    upload = _uploads.get(upload_id)
    if not upload or upload["owner"] != owner:
        raise _not_found()
    return upload


def expected_chunk_size(upload: dict, index: int) -> int:
    """Bytes que debe traer el fragmento `index`: `chunk` salvo el último, que trae el resto."""
    return min(upload["chunk"], upload["size"] - index * upload["chunk"])


def add_chunk(upload: dict, index: int, data: bytes) -> int:
    """Guarda el fragmento `index` (base 0). Repetir uno ya recibido lo reemplaza, así reintentar es
    seguro. Devuelve cuántos fragmentos llevan recibidos. Lanza `INVALID_CHUNK` (400)."""
    if not 0 <= index < upload["total"]:
        raise AppError(400, "INVALID_CHUNK", f"El fragmento {index} no existe (hay {upload['total']}).")
    if len(data) != expected_chunk_size(upload, index):
        raise AppError(
            400,
            "INVALID_CHUNK",
            f"El fragmento {index} debe pesar {expected_chunk_size(upload, index)} bytes y llegaron {len(data)}.",
        )
    if index == 0 and not looks_like_pdf(data):
        raise AppError(415, "INVALID_FILE", "El archivo no es un PDF válido.")
    start = index * upload["chunk"]
    upload["buffer"][start : start + len(data)] = data
    upload["received"].add(index)
    upload["expira"] = time.monotonic() + get_limits().stage_ttl_seconds
    return len(upload["received"])


def finish_upload(upload: dict) -> bytes:
    """Cierra la subida y devuelve el PDF completo. Lanza `INCOMPLETE_UPLOAD` (409) si faltan
    fragmentos (con `faltan`, los índices que faltan) o `INVALID_FILE` (415) si no es un PDF."""
    missing = [i for i in range(upload["total"]) if i not in upload["received"]]
    if missing:
        raise AppError(
            409,
            "INCOMPLETE_UPLOAD",
            f"Faltan {len(missing)} fragmento(s) del archivo.",
            faltan=missing[:50],
        )
    data = bytes(upload["buffer"])
    _remove(upload)
    if not looks_like_pdf(data):
        raise AppError(415, "INVALID_FILE", "El archivo no es un PDF válido.")
    return data


def discard_upload(upload_id: str, owner: str) -> None:
    """Descarta una subida (se canceló o falló). No falla si ya no existe."""
    upload = _uploads.get(upload_id)
    if upload and upload["owner"] == owner:
        _remove(upload)


def reset_uploads() -> None:
    """Vacía el registro. Solo para pruebas."""
    for upload in list(_uploads.values()):
        _remove(upload)
    _uploads.clear()
    _by_owner.clear()
