"""Portadas como archivos en disco (ver docs/adr/0005-portadas-en-disco.md)."""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

from ..config import get_covers_dir

EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
#: Un nombre válido es siempre `<ObjectId>.<ext>`: nunca contiene rutas.
FILE_NAME = re.compile(r"^[0-9a-f]{24}\.(jpg|png|webp)$")


def cover_file_path(archivo: str | None) -> Path | None:
    """Ruta absoluta de una portada guardada, o `None` si el nombre no tiene el formato esperado
    (así un valor corrupto en la base de datos no puede apuntar fuera de la carpeta)."""
    if isinstance(archivo, str) and FILE_NAME.match(archivo):
        return get_covers_dir() / archivo
    return None


def _write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


async def save_cover(book_id, data: bytes, mime: str) -> dict:
    """Guarda la imagen como `<id del libro>.<ext>`. Devuelve lo que va en `Book.portada`."""
    archivo = f"{book_id}.{EXTENSIONS[mime]}"
    await asyncio.to_thread(_write, get_covers_dir() / archivo, data)
    return {"archivo": archivo, "mime": mime}


async def delete_cover(archivo: str | None) -> None:
    """Borra el archivo; no falla si ya no existe o el nombre no es válido."""
    path = cover_file_path(archivo)
    if path is None:
        return
    await asyncio.to_thread(lambda: path.unlink(missing_ok=True))
