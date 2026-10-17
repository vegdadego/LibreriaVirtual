"""Relación de los usuarios con los libros: guardados, progreso y carpetas."""

from __future__ import annotations

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..http import utcnow


async def upsert_user_book(usuario: ObjectId, libro: ObjectId, update: dict) -> dict:
    """Actualiza (o crea) la relación de un usuario con un libro y devuelve el documento resultante.

    `update` lleva operadores (`$set`, `$unset`...). Dos peticiones simultáneas pueden chocar con
    el índice único; en ese caso se reintenta una vez, y la segunda ya encuentra el documento.
    """
    now = utcnow()
    to_set = {**update.get("$set", {}), "updatedAt": now}
    on_insert = {"createdAt": now}
    for field, default in (("guardado", False), ("pagina_actual", 0)):
        # Un campo no puede estar a la vez en $set y en $setOnInsert.
        if field not in to_set:
            on_insert[field] = default
    full_update = {**update, "$set": to_set, "$setOnInsert": on_insert}

    async def run() -> dict:
        return await get_db().user_books.find_one_and_update(
            {"usuario": usuario, "libro": libro},
            full_update,
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    try:
        return await run()
    except DuplicateKeyError:
        return await run()


async def remove_book_references(book_id: ObjectId) -> None:
    """Borra todo lo que apunta a un libro eliminado (guardados, progreso, carpetas)."""
    db = get_db()
    await db.user_books.delete_many({"libro": book_id})
    await db.folders.update_many({"libros": book_id}, {"$pull": {"libros": book_id}})
