"""Pasa a la colección `book_pages` las páginas que aún están dentro del documento del libro
(`contenido_escaneado`) y, opcionalmente, borra las páginas huérfanas (ver ADR 0012).

Es seguro repetirlo: por cada libro escribe las páginas por lotes y solo después quita
`contenido_escaneado`; si se interrumpe a la mitad, la siguiente corrida rehace ese libro.
Mientras no se corra, los libros anteriores se siguen leyendo desde su propio documento.

Uso (desde backend/):
    python -m scripts.migrate_pages              # migra los libros pendientes
    python -m scripts.migrate_pages --orphans    # además borra páginas cuyo libro ya no existe
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from app import db
from app.config import load_env
from app.services.analysis.content_start import detect_content_start
from app.services.book_pages import delete_pages, insert_pages


async def migrate_database(database, orphans: bool = False) -> tuple[int, int]:
    """Migra los libros con `contenido_escaneado` de `database`. Devuelve `(libros migrados, páginas huérfanas borradas)`."""
    migrated = 0
    removed = 0
    # Se recorren solo los ids: cada libro se carga de uno en uno para no tener varios textos en memoria.
    ids = [book["_id"] async for book in database.books.find({"contenido_escaneado": {"$exists": True}}, {"_id": 1})]
    for book_id in ids:
        book = await database.books.find_one({"_id": book_id}, {"contenido_escaneado": 1, "inicio_contenido": 1})
        if book is None:
            continue
        pages = sorted(book.get("contenido_escaneado") or [], key=lambda page: page["pagina"])
        pages = [{"pagina": page["pagina"], "texto": page.get("texto", "")} for page in pages]
        await delete_pages(book_id)  # por si una corrida anterior se interrumpió a la mitad
        await insert_pages(book_id, pages)
        changes: dict = {"total_paginas": len(pages)}
        if book.get("inicio_contenido") is None:
            changes["inicio_contenido"] = detect_content_start(pages) or 0
        await database.books.update_one({"_id": book_id}, {"$set": changes, "$unset": {"contenido_escaneado": ""}})
        migrated += 1
        print(f"  · {book_id}: {len(pages)} página(s)")

    if orphans:
        owners = await database.book_pages.distinct("libro")
        alive = {book["_id"] async for book in database.books.find({"_id": {"$in": owners}}, {"_id": 1})}
        for owner in owners:
            if owner not in alive:
                removed += await delete_pages(owner)
    return migrated, removed


async def migrate(orphans: bool = False) -> tuple[int, int]:
    """Conecta con `MONGO_URI`, migra y desconecta."""
    load_env()
    database = await db.connect()
    try:
        await db.ensure_indexes(database)
        migrated, removed = await migrate_database(database, orphans)
    finally:
        await db.disconnect()
    print(f"✅ {migrated} libro(s) migrados a book_pages." + (f" {removed} página(s) huérfanas borradas." if orphans else ""))
    return migrated, removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--orphans", action="store_true", help="borra también las páginas de libros que ya no existen")
    args = parser.parse_args()
    try:
        asyncio.run(migrate(orphans=args.orphans))
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo migrar: {error}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
