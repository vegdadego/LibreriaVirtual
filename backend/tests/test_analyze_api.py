"""POST /books/analyze: permisos, validación del archivo y respuesta."""

from __future__ import annotations

from tests.conftest import make_token
from tests.helpers.api import upload
from tests.test_analysis import book_pdf


async def test_analyze_requires_uploader_and_validates_the_file(client):
    pdf = book_pdf({"Author": "Ana Pérez"})
    uploader = make_token("uploader")

    assert (await upload(client, token=None, pdf=pdf, path="/books/analyze")).status_code == 401
    assert (await upload(client, token=make_token("lector"), pdf=pdf, path="/books/analyze")).status_code == 403
    assert (await upload(client, token=uploader, path="/books/analyze", fields={"x": "y"})).json()["code"] == "FILE_REQUIRED"
    assert (await upload(client, token=uploader, pdf=b"no soy pdf", path="/books/analyze")).json()["code"] == "INVALID_FILE"
    broken = await upload(client, token=uploader, pdf=b"%PDF-1.4 roto", path="/books/analyze")
    assert broken.status_code == 422 and broken.json()["code"] == "CORRUPT_PDF"

    ok = await upload(client, token=make_token("admin"), pdf=pdf, path="/books/analyze")
    assert ok.status_code == 200
    body = ok.json()
    assert body["success"] is True
    assert body["data"]["autores"] == ["Ana Pérez"]
    assert body["data"]["idioma"] == "es"
    assert body["data"]["categorias"][0] == "Fantasía"
    assert body["data"]["fuentes"]["autores"] == "metadatos"
