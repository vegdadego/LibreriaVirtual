"""Ayudas para las pruebas de la API."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx
from bson import ObjectId

from app.db import get_db
from tests.conftest import auth


async def api(client: httpx.AsyncClient, path: str, *, token: str | None = None, method: str = "GET", json=None):
    """Llama a la API y devuelve `(status, cuerpo)`."""
    response = await client.request(method, path, headers=auth(token), json=json)
    return response.status_code, response.json()


async def upload(
    client: httpx.AsyncClient,
    *,
    token: str | None,
    pdf: bytes | None = None,
    cover: tuple[bytes, str] | None = None,
    fields: dict | None = None,
    mimetype: str = "application/pdf",
    path: str = "/books/upload",
) -> httpx.Response:
    """Envía un PDF, una portada opcional y campos de texto como `multipart/form-data`."""
    files: list = []
    if pdf is not None:
        files.append(("pdf", ("libro.pdf", pdf, mimetype)))
    if cover is not None:
        files.append(("portada", ("portada.img", cover[0], cover[1])))
    for key, value in (fields or {}).items():
        files.append((key, (None, value)))
    return await client.post(path, headers=auth(token), files=files)


async def wait_for_job(client: httpx.AsyncClient, job_id: str, token: str) -> dict:
    """Consulta el trabajo hasta que termina (completado o error)."""
    for _ in range(400):
        _, body = await api(client, f"/books/uploads/{job_id}", token=token)
        if body["data"]["estado"] in ("completado", "error"):
            return body["data"]
        await asyncio.sleep(0.025)
    raise AssertionError("La carga no terminó a tiempo")


async def make_book(titulo: str, pages: int = 5, **extra) -> dict:
    """Inserta un libro con `pages` páginas de texto directamente en la base de datos."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    document = {
        "_id": ObjectId(),
        "titulo": titulo,
        "numero_edicion": 1,
        "sinopsis": "",
        "idioma": "es",
        "categorias": [],
        "autores": [],
        "saga": None,
        "contenido_escaneado": [{"pagina": i + 1, "texto": f"texto {i + 1}"} for i in range(pages)],
        "createdAt": now,
        "updatedAt": now,
        **extra,
    }
    await get_db().books.insert_one(document)
    return document
