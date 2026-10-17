"""Pasa a disco las portadas que aún están dentro del documento del libro (`portada.data`).

Es seguro repetirlo: solo toca los libros que todavía conservan la imagen en la base de datos
y borra `portada.data` únicamente después de escribir el archivo (ver ADR 0005).

Uso (desde backend/):  python -m scripts.migrate_covers
"""

from __future__ import annotations

import asyncio
import sys

from app import db
from app.config import get_covers_dir, load_env
from app.services.cover_storage import save_cover


async def migrate() -> int:
    load_env()
    database = await db.connect()
    print(f"📁 Las portadas se guardarán en {get_covers_dir()}")
    moved = 0
    try:
        async for book in database.books.find({"portada.data": {"$exists": True}}, {"portada": 1}):
            saved = await save_cover(book["_id"], bytes(book["portada"]["data"]), book["portada"]["mime"])
            await database.books.update_one(
                {"_id": book["_id"]},
                {"$set": {"portada.archivo": saved["archivo"], "portada.mime": saved["mime"]}, "$unset": {"portada.data": ""}},
            )
            moved += 1
    finally:
        await db.disconnect()
    print(f"✅ {moved} portada(s) pasadas a disco.")
    return moved


if __name__ == "__main__":
    try:
        asyncio.run(migrate())
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo migrar: {error}")
        sys.exit(1)
