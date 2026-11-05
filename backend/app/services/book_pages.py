"""Páginas de los libros: una colección aparte (`book_pages`) con un documento por página.

Antes todo el texto iba dentro del documento del libro: una sola escritura enorme, tope de 16 MB
por libro y MongoDB debía cargar el libro entero para servir una página. Ahora el libro solo lleva
sus metadatos y `total_paginas`, y las páginas se escriben **por lotes** (ver docs/adr/0012).

Los libros anteriores conservan `contenido_escaneado` dentro del documento; las funciones de
lectura de aquí los siguen atendiendo hasta que se corra `scripts/migrate_pages.py`.
"""

from __future__ import annotations

from bson import ObjectId

from ..db import get_db

#: Máximo de páginas por escritura.
PAGES_PER_BATCH = 100
#: Máximo de texto por escritura (MongoDB admite 48 MB por lote; así cada escritura es pequeña).
BYTES_PER_BATCH = 2 * 1024 * 1024
#: Lo que se suma al texto de cada página por su id, número y estructura BSON.
_DOC_OVERHEAD = 80


def split_batches(pages: list[dict]) -> list[list[dict]]:
    """Reparte las páginas en lotes de hasta `PAGES_PER_BATCH` páginas y `BYTES_PER_BATCH` bytes."""
    batches: list[list[dict]] = []
    batch: list[dict] = []
    size = 0
    for page in pages:
        weight = len(page["texto"].encode("utf-8")) + _DOC_OVERHEAD
        if batch and (len(batch) >= PAGES_PER_BATCH or size + weight > BYTES_PER_BATCH):
            batches.append(batch)
            batch, size = [], 0
        batch.append(page)
        size += weight
    if batch:
        batches.append(batch)
    return batches


async def insert_pages(book_id: ObjectId, pages: list[dict]) -> int:
    """Guarda las páginas de un libro en lotes, uno tras otro (nunca varios a la vez, para no
    saturar a MongoDB). Devuelve cuántas guardó. Si falla, quien llama debe usar `delete_pages`."""
    collection = get_db().book_pages
    for batch in split_batches(pages):
        await collection.insert_many(
            [{"libro": book_id, "pagina": page["pagina"], "texto": page["texto"]} for page in batch]
        )
    return len(pages)


async def delete_pages(book_id: ObjectId) -> int:
    """Borra todas las páginas guardadas de un libro. Devuelve cuántas había."""
    result = await get_db().book_pages.delete_many({"libro": book_id})
    return result.deleted_count


async def read_page_text(book_id: ObjectId, number: int) -> str | None:
    """Texto de una página guardada en `book_pages`, o `None` si no está ahí (libro anterior o página inexistente)."""
    document = await get_db().book_pages.find_one({"libro": book_id, "pagina": number}, {"texto": 1})
    return None if document is None else document.get("texto", "")


async def read_pages(book_id: ObjectId, legacy: list[dict] | None = None) -> list[dict]:
    """Todas las páginas de un libro, en orden: `[{"pagina", "texto"}, ...]`.

    Lee `book_pages`; si el libro no tiene páginas ahí usa `legacy` (su `contenido_escaneado`).
    """
    cursor = get_db().book_pages.find({"libro": book_id}, {"_id": 0, "pagina": 1, "texto": 1}).sort("pagina", 1)
    pages = await cursor.to_list(None)
    if pages:
        return [{"pagina": page["pagina"], "texto": page.get("texto", "")} for page in pages]
    ordered = sorted(legacy or [], key=lambda page: page["pagina"])
    return [{"pagina": page["pagina"], "texto": page.get("texto", "")} for page in ordered]


__all__ = [
    "BYTES_PER_BATCH",
    "PAGES_PER_BATCH",
    "delete_pages",
    "insert_pages",
    "read_page_text",
    "read_pages",
    "split_batches",
]
