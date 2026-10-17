"""Asigna un dueño (`subido_por`) a los libros que no lo tienen.

Los libros subidos antes de que existiera el campo no tienen dueño y solo un admin puede
gestionarlos. Es seguro repetirlo: solo toca los libros sin `subido_por` (ver ADR 0009).

Uso (desde backend/):  python -m scripts.assign_owner <nombre_usuario> [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from app import db
from app.config import load_env

#: Libros que aún no tienen dueño (campo ausente o nulo).
WITHOUT_OWNER = {"subido_por": {"$in": [None]}}


async def assign(username: str, dry_run: bool = False) -> int:
    """Asigna los libros sin dueño al usuario `username`. Devuelve cuántos libros afecta
    (con `dry_run` solo los cuenta). Lanza `LookupError` si el usuario no existe."""
    load_env()
    database = await db.connect()
    try:
        user = await database.users.find_one({"nombre_usuario": username}, {"nombre_usuario": 1, "tipo_usuario": 1})
        if not user:
            raise LookupError(f'No existe el usuario "{username}".')
        pending = await database.books.count_documents(WITHOUT_OWNER)
        if dry_run:
            print(f"🔎 {pending} libro(s) sin dueño; se asignarían a {user['nombre_usuario']} ({user.get('tipo_usuario')}).")
            return pending
        result = await database.books.update_many(WITHOUT_OWNER, {"$set": {"subido_por": user["_id"]}})
        print(f"✅ {result.modified_count} libro(s) asignados a {user['nombre_usuario']}.")
        return result.modified_count
    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Asigna un dueño a los libros que no lo tienen.")
    parser.add_argument("nombre_usuario", help="Usuario que pasa a ser dueño de los libros sin dueño.")
    parser.add_argument("--dry-run", action="store_true", help="Solo cuenta los libros, sin cambiar nada.")
    args = parser.parse_args()
    try:
        asyncio.run(assign(args.nombre_usuario, args.dry_run))
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo asignar: {error}")
        sys.exit(1)
