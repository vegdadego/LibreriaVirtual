"""Consultas compartidas de libros: campos calculados y proyecciones del catálogo."""

from __future__ import annotations

from bson import ObjectId

from ..db import LOOSE_COLLATION, get_db
from .analysis.content_start import detect_content_start

#: Número de páginas guardadas de un libro.
PAGE_COUNT = {"$size": {"$ifNull": ["$contenido_escaneado", []]}}
#: Indica si el libro tiene portada, sin traer la imagen.
HAS_COVER = {"$cond": [{"$ifNull": ["$portada.mime", False]}, True, False]}
#: Campos calculados que acompañan a los metadatos de un libro.
DERIVED_FIELDS = {"total_paginas": PAGE_COUNT, "tiene_portada": HAS_COVER}
#: Campos que nunca viajan con los metadatos: los pesados y el id de quien subió el libro.
HEAVY_FIELDS = {"contenido_escaneado": 0, "portada": 0, "subido_por": 0, "hash_pdf": 0}


async def find_catalog_books_by_ids(ids: list[ObjectId]) -> list[dict]:
    """Metadatos de varios libros (sin texto ni imagen), en el orden de `ids`.
    Los ids que ya no existen se omiten."""
    if not ids:
        return []
    cursor = await get_db().books.aggregate(
        [
            {"$match": {"_id": {"$in": ids}}},
            {"$addFields": DERIVED_FIELDS},
            {"$project": HEAVY_FIELDS},
        ]
    )
    by_id = {book["_id"]: book async for book in cursor}
    return [by_id[i] for i in ids if i in by_id]


async def ensure_content_start(book_id: ObjectId) -> int:
    """`inicio_contenido` de un libro (0 si no se detectó), calculándolo y guardándolo la primera vez.

    Los libros subidos antes de que existiera el campo no lo tienen; aquí se calcula con su texto
    ya guardado, una sola vez, sin tocar `updatedAt`."""
    book = await get_db().books.find_one({"_id": book_id}, {"inicio_contenido": 1, "contenido_escaneado": 1})
    if not book:
        return 0
    if book.get("inicio_contenido") is not None:
        return book["inicio_contenido"]
    start = detect_content_start(book.get("contenido_escaneado") or []) or 0
    await get_db().books.update_one({"_id": book_id}, {"$set": {"inicio_contenido": start}})
    return start


async def count_book_pages(book_id: ObjectId) -> int | None:
    """Número de páginas de un libro, o `None` si no existe."""
    cursor = await get_db().books.aggregate(
        [{"$match": {"_id": book_id}}, {"$project": {"total": PAGE_COUNT}}]
    )
    async for result in cursor:
        return result["total"]
    return None


__all__ = [
    "DERIVED_FIELDS",
    "HEAVY_FIELDS",
    "LOOSE_COLLATION",
    "PAGE_COUNT",
    "count_book_pages",
    "ensure_content_start",
    "find_catalog_books_by_ids",
]
