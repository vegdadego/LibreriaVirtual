"""Aplicación FastAPI: API REST de la Biblioteca Virtual.

Arranque (desde `backend/`):  `python -m uvicorn app.main:app --port 8000`
Documentación interactiva de los endpoints: http://localhost:8000/docs
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import get_jwt_secret, load_env
from .errors import install_error_handlers
from .routers import auth, books, catalogs, me
from .serialize import ApiResponse
from .services.pdf_text import shutdown_pool, warm_up_pool

load_env()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_jwt_secret()  # falla al arrancar, no en la primera petición
    await db.connect()
    await db.ensure_indexes()
    if os.environ.get("PDF_POOL_WARMUP", "1") != "0":
        await warm_up_pool()
    log.info("API lista en /api/v1 (documentación en /docs)")
    try:
        yield
    finally:
        shutdown_pool()
        await db.disconnect()


app = FastAPI(
    title="Biblioteca Virtual API",
    version="2.0.0",
    description="API REST de la biblioteca virtual: libros, lectura, subida de PDF y biblioteca personal.",
    default_response_class=ApiResponse,
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
install_error_handlers(app)


def _health() -> dict:
    """Diagnóstico de salud (lo usa `apiClient.checkConnection` del frontend)."""
    name = db.get_db().name if db._db is not None else "virtual_library_db"  # noqa: SLF001
    return {"status": "ok", "database": name, "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}


@app.get("/health", include_in_schema=False)
@app.get("/api/v1/health")
async def health():
    return ApiResponse(_health())


app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(books.router, prefix="/api/v1/books", tags=["libros"])
app.include_router(me.router, prefix="/api/v1/me", tags=["biblioteca personal"])
app.include_router(catalogs.sagas_router, prefix="/api/v1/sagas", tags=["sagas"])
app.include_router(catalogs.authors_router, prefix="/api/v1/authors", tags=["autores"])
app.include_router(catalogs.users_router, prefix="/api/v1/users", tags=["usuarios (admin)"])
