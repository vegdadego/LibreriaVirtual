"""Conexión a MongoDB (cliente asíncrono de PyMongo) e índices."""

from __future__ import annotations

import logging
import os

import dns.resolver
from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.collation import Collation

log = logging.getLogger("app")

DEFAULT_DB_NAME = "virtual_library_db"

_client: AsyncMongoClient | None = None
_db: AsyncDatabase | None = None


def _configure_dns() -> None:
    """Las URI `mongodb+srv://` usan consultas SRV, que algunos DNS locales rechazan.
    `DNS_SERVERS` (lista separada por comas) fuerza otros servidores."""
    servers = [s.strip() for s in os.environ.get("DNS_SERVERS", "").split(",") if s.strip()]
    if servers:
        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = servers
        dns.resolver.default_resolver = resolver


async def connect(uri: str | None = None) -> AsyncDatabase:
    """Conecta usando `MONGO_URI` (o `uri`) y deja la base lista para `get_db()`."""
    global _client, _db
    uri = uri or os.environ.get("MONGO_URI")
    if not uri:
        raise RuntimeError("Falta MONGO_URI. Defínela en backend/.env (ver backend/.env.example).")
    _configure_dns()
    # 30 s es lo que esperaba el backend anterior; Atlas a veces tarda en elegir el primario.
    _client = AsyncMongoClient(uri, serverSelectionTimeoutMS=30000)
    await _client.admin.command("ping")
    try:
        _db = _client.get_default_database()
    except Exception:  # la URI no trae nombre de base
        _db = _client[DEFAULT_DB_NAME]
    log.info("MongoDB conectado: %s", _db.name)
    return _db


async def disconnect() -> None:
    global _client, _db
    if _client is not None:
        await _client.close()
    _client, _db = None, None


def get_db() -> AsyncDatabase:
    if _db is None:
        raise RuntimeError("La base de datos no está conectada.")
    return _db


#: Colación de los índices y consultas "sin distinguir mayúsculas ni acentos" de libros.
LOOSE_COLLATION = Collation(locale="en", strength=1)
#: Colación de las carpetas (nombre único por usuario).
FOLDER_COLLATION = Collation(locale="es", strength=1)


async def ensure_indexes(db: AsyncDatabase | None = None) -> None:
    """Crea los índices que antes creaba Mongoose. Es idempotente; un conflicto con un
    índice ya existente distinto se avisa pero no detiene el arranque."""
    db = db or get_db()
    specs = [
        ("users", [("nombre_usuario", ASCENDING)], {"unique": True}),
        ("users", [("correo", ASCENDING)], {"unique": True}),
        ("authors", [("nombre", ASCENDING)], {"unique": True}),
        ("sagas", [("nombre", ASCENDING)], {"unique": True}),
        ("user_books", [("usuario", ASCENDING), ("libro", ASCENDING)], {"unique": True}),
        ("user_books", [("usuario", ASCENDING), ("guardado", ASCENDING), ("guardado_en", DESCENDING)], {}),
        ("user_books", [("usuario", ASCENDING), ("ultima_lectura", DESCENDING)], {}),
        ("folders", [("usuario", ASCENDING), ("nombre", ASCENDING)], {"unique": True, "collation": FOLDER_COLLATION}),
        ("folders", [("usuario", ASCENDING), ("updatedAt", DESCENDING)], {}),
        ("folders", [("libros", ASCENDING)], {}),
    ]
    for collection, keys, options in specs:
        try:
            await db[collection].create_index(keys, **options)
        except Exception as error:  # noqa: BLE001
            log.warning("No se pudo crear el índice %s %s: %s", collection, keys, error)
