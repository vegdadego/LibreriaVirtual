"""Consultas compartidas de libros: campos calculados y proyecciones del catálogo."""

from __future__ import annotations

from bson import ObjectId

from ..db import LOOSE_COLLATION, get_db

#: Número de páginas guardadas de un libro.
PAGE_COUNT = {"$size": {"$ifNull": ["$contenido_escaneado", []]}}
#: Indica si el libro tiene portada, sin traer la imagen.
HAS_COVER = {"$cond": [{"$ifNull": ["$portada.mime", False]}, True, False]}
#: Campos calculados que acompañan a los metadatos de un libro.
DERIVED_FIELDS = {"total_paginas": PAGE_COUNT, "tiene_portada": HAS_COVER}
#: Campos pesados que nunca viajan con los metadatos.
HEAVY_FIELDS = {"contenido_escaneado": 0, "portada": 0}


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
    "find_catalog_books_by_ids",
]
