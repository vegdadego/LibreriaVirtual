"""Puebla la base de datos con datos de ejemplo.

⚠ BORRA los usuarios, sagas, autores y libros que existan. Por eso exige `--yes`.

Uso (desde backend/):  python -m scripts.seed --yes
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone

from bson import ObjectId

from app import db
from app.config import load_env


async def seed() -> None:
    load_env()
    database = await db.connect()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        print("🧹 Limpiando colecciones anteriores...")
        for name in ("users", "sagas", "authors", "books"):
            await database[name].delete_many({})
        await db.ensure_indexes()

        print("📝 Insertando documentos iniciales...")
        user_id, saga_id, author_id, book_id = (ObjectId(f"652a1b2c3d4e5f6a7b8c9d0{i}") for i in range(1, 5))
        stamps = {"createdAt": now, "updatedAt": now}
        await database.users.insert_one(
            {
                "_id": user_id,
                "nombre_usuario": "GustavoM",
                "correo": "gustavo@example.com",
                # bcrypt de la contraseña "password"
                "password_hash": "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGEiYYA1e",
                "tipo_usuario": "uploader",
                "fecha_registro": datetime(2026, 10, 12, 17, 27),
                **stamps,
            }
        )
        await database.sagas.insert_one(
            {
                "_id": saga_id,
                "nombre": "Nacidos de la Bruma",
                "descripcion": "Una serie de novelas de alta fantasía que explora un mundo donde la ceniza cae del cielo y las brumas dominan la noche.",
                "estado": "Finalizada",
                "libros_totales": 7,
                **stamps,
            }
        )
        await database.authors.insert_one(
            {
                "_id": author_id,
                "nombre": "Brandon Sanderson",
                "biografia": "Autor de literatura fantástica y ciencia ficción, conocido por su sistema de magia...",
                "nacionalidad": "Estadounidense",
                **stamps,
            }
        )
        await database.books.insert_one(
            {
                "_id": book_id,
                "titulo": "El Imperio Final",
                "fecha_publicacion": datetime(2006, 7, 17),
                "empresa_edicion": "Ediciones B",
                "numero_edicion": 1,
                "sinopsis": "Durante mil años han caído las cenizas y nada florece. Durante mil años los skaa han sido esclavizados y viven sumidos en un miedo inevitable...",
                "idioma": "es",
                "categorias": ["Fantasía", "Aventura"],
                "autores": [{"id_autor": author_id, "nombre": "Brandon Sanderson"}],
                "saga": {"id_saga": saga_id, "nombre_saga": "Nacidos de la Bruma", "numero_en_saga": 1},
                "contenido_escaneado": [
                    {"pagina": 1, "texto": "Prólogo. A veces me preocupa no ser el héroe que todos piensan que soy..."},
                    {"pagina": 2, "texto": "Capítulo 1. La ceniza caía del cielo como una nieve negra y seca..."},
                    {"pagina": 3, "texto": "Kelsier sonrió. Era una sonrisa que no auguraba nada bueno para el Imperio..."},
                ],
                **stamps,
            }
        )
        print("✅ Base de datos poblada: 1 usuario (GustavoM), 1 saga, 1 autor y 1 libro de 3 páginas.")
    finally:
        await db.disconnect()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--yes", action="store_true", help="confirma que se pueden borrar los datos actuales")
    if not parser.parse_args().yes:
        print("Esto borra usuarios, sagas, autores y libros de la base de datos. Repite con --yes para continuar.")
        return 1
    asyncio.run(seed())
    return 0


if __name__ == "__main__":
    sys.exit(main())
