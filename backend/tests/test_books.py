"""Subida, catálogo, lectura y portadas (port de `server/test/books.test.js`)."""

from __future__ import annotations

from bson import ObjectId

from app.db import get_db
from tests.conftest import auth, make_token
from tests.helpers.api import api, make_book, upload, wait_for_job
from tests.helpers.make_pdf import make_numbered_pdf, make_pdf

UPLOADER_ID = str(ObjectId())
UPLOADER = make_token("uploader", UPLOADER_ID)
LECTOR = make_token("lector")
NO_ID = "64b000000000000000000000"


async def test_requires_session_and_role_to_write(client):
    pdf = make_numbered_pdf(2)
    assert (await upload(client, token=None, pdf=pdf, fields={"titulo": "X"})).status_code == 401
    assert (await upload(client, token=LECTOR, pdf=pdf, fields={"titulo": "X"})).status_code == 403
    assert (await api(client, "/books/uploads/abc"))[0] == 401
    assert (await api(client, f"/books/{NO_ID}", method="DELETE", token=LECTOR))[0] == 403
    assert (await api(client, "/books"))[0] == 200  # la lectura del catálogo es pública


async def test_validates_file_and_metadata_before_processing(client, database):
    no_file = await upload(client, token=UPLOADER, fields={"titulo": "Sin archivo"})
    assert no_file.status_code == 400 and no_file.json()["code"] == "FILE_REQUIRED"

    not_pdf = await upload(client, token=UPLOADER, pdf=b"esto no es un pdf", fields={"titulo": "Texto"})
    assert not_pdf.status_code == 415 and not_pdf.json()["code"] == "INVALID_FILE"

    wrong_type = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(1), fields={"titulo": "Tipo"}, mimetype="image/png")
    assert wrong_type.status_code == 415

    no_title = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(1), fields={"titulo": "  "})
    assert no_title.status_code == 400 and no_title.json()["code"] == "INVALID_METADATA"

    too_big = b"%PDF-1.4\n" + bytes(int(1.2 * 1024 * 1024))
    big = await upload(client, token=UPLOADER, pdf=too_big, fields={"titulo": "Enorme"})
    assert big.status_code == 413 and big.json()["code"] == "FILE_TOO_LARGE"

    extra_file = await client.post(
        "/books/upload",
        headers=auth(UPLOADER),
        files=[("pdf", ("a.pdf", make_numbered_pdf(1), "application/pdf")), ("otro", ("b.pdf", b"x", "application/pdf"))],
    )
    assert extra_file.status_code == 400 and extra_file.json()["code"] == "INVALID_UPLOAD"

    assert await database.books.count_documents({}) == 0


async def test_full_flow_upload_30_pages_catalog_and_read_page_by_page(client, database):
    await database.authors.insert_one({"nombre": "Gabriela Ñandú"})

    sent = await upload(
        client,
        token=UPLOADER,
        pdf=make_numbered_pdf(30),
        fields={
            "titulo": "El Libro de Prueba",
            "sinopsis": "Una historia de treinta páginas",
            "categorias": "Fantasía, Aventura",
            "autores": "gabriela nandu",
            "saga": "Sin Saga Registrada",
            "numero_en_saga": "2",
            "numero_edicion": "3",
            "fecha_publicacion": "2020-05-01",
        },
    )
    assert sent.status_code == 202
    assert "/books/uploads/" in sent.headers["location"]
    job_id = sent.json()["data"]["jobId"]
    assert sent.json()["data"]["estado"] == "pendiente"

    # Solo el dueño (o admin) puede ver el estado.
    assert (await api(client, f"/books/uploads/{job_id}", token=make_token("uploader")))[0] == 404
    assert (await api(client, f"/books/uploads/{job_id}", token=make_token("admin")))[0] == 200

    job = await wait_for_job(client, job_id, UPLOADER)
    assert job["estado"] == "completado"
    assert job["progreso"] == {"paginas_procesadas": 30, "total_paginas": 30}
    assert job["libro_id"]
    print(f"  procesamiento completo en {job['duracion_ms']} ms")

    _, listing = await api(client, "/books")
    assert listing["total"] == 1
    item = listing["data"][0]
    assert item["total_paginas"] == 30
    assert "contenido_escaneado" not in item
    assert item["categorias"] == ["Fantasía", "Aventura"]
    assert item["numero_edicion"] == 3
    assert item["saga"]["nombre_saga"] == "Sin Saga Registrada"
    assert item["saga"]["numero_en_saga"] == 2
    assert item["autores"][0]["nombre"] == "Gabriela Ñandú"  # toma el nombre del autor registrado
    assert item["autores"][0]["id_autor"]  # enlaza al autor existente
    assert item["fecha_publicacion"] == "2020-05-01T00:00:00.000Z"

    _, detail = await api(client, f"/books/{job['libro_id']}")
    assert detail["data"]["total_paginas"] == 30
    assert "contenido_escaneado" not in detail["data"]

    stored = await database.books.find_one({"_id": ObjectId(job["libro_id"])})
    assert len(stored["contenido_escaneado"]) == 30  # el texto completo está en la BD

    for n in range(1, 31):
        status, body = await api(client, f"/books/{job['libro_id']}/paginas/{n}")
        assert status == 200
        data = body["data"]
        assert data["pagina"] == n and data["total_paginas"] == 30
        assert data["anterior"] == (None if n == 1 else n - 1)
        assert data["siguiente"] == (None if n == 30 else n + 1)
        assert data["texto"].startswith(f"Página {n} - Capítulo único\n")
        assert data["texto"].endswith("canción, ñandú, ¿qué?")
    assert (await api(client, f"/books/{job['libro_id']}/paginas/31"))[1]["code"] == "PAGE_NOT_FOUND"
    assert (await api(client, f"/books/{job['libro_id']}/paginas/0"))[0] == 400
    assert (await api(client, f"/books/{job['libro_id']}/paginas/abc"))[0] == 400
    assert (await api(client, "/books/no-es-un-id/paginas/1"))[0] == 400
    assert (await api(client, f"/books/{NO_ID}/paginas/1"))[0] == 404


async def test_retry_with_same_file_returns_same_job_and_does_not_duplicate(client, database):
    pdf = make_numbered_pdf(3)
    first = await upload(client, token=UPLOADER, pdf=pdf, fields={"titulo": "Reintento"})
    retry = await upload(client, token=UPLOADER, pdf=pdf, fields={"titulo": "Reintento"})
    assert first.status_code == 202
    assert retry.status_code == 200
    assert retry.json()["data"]["jobId"] == first.json()["data"]["jobId"]

    assert (await wait_for_job(client, first.json()["data"]["jobId"], UPLOADER))["estado"] == "completado"
    assert await database.books.count_documents({"titulo": "Reintento"}) == 1

    dup = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(4), fields={"titulo": "reintento"})
    assert dup.status_code == 409
    assert dup.json()["code"] == "DUPLICATE_BOOK" and dup.json()["libro_id"]
    # ...pero otra edición es otro libro.
    edition = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(4), fields={"titulo": "Reintento", "numero_edicion": "2"})
    assert edition.status_code == 202
    assert (await wait_for_job(client, edition.json()["data"]["jobId"], UPLOADER))["estado"] == "completado"


async def test_two_simultaneous_uploads_of_same_title_only_one_is_processed(client, database):
    import asyncio

    a, b = await asyncio.gather(
        upload(client, token=UPLOADER, pdf=make_numbered_pdf(5), fields={"titulo": "Carrera"}),
        upload(client, token=UPLOADER, pdf=make_numbered_pdf(6), fields={"titulo": "Carrera"}),
    )
    assert sorted([a.status_code, b.status_code]) == [202, 409]
    winner = a if a.status_code == 202 else b
    assert (await wait_for_job(client, winner.json()["data"]["jobId"], UPLOADER))["estado"] == "completado"
    assert await database.books.count_documents({"titulo": "Carrera"}) == 1


async def test_keeps_empty_pages_to_preserve_numbering(client):
    sent = await upload(client, token=UPLOADER, pdf=make_pdf([["primera"], [], ["tercera"]]), fields={"titulo": "Con hoja en blanco"})
    job = await wait_for_job(client, sent.json()["data"]["jobId"], UPLOADER)
    assert job["estado"] == "completado"
    _, blank = await api(client, f"/books/{job['libro_id']}/paginas/2")
    assert blank["data"]["texto"] == ""
    assert blank["data"]["total_paginas"] == 3


async def test_corrupt_or_textless_pdf_ends_in_error_and_leaves_no_books(client, database):
    before = await database.books.count_documents({})

    corrupt = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(3)[:150], fields={"titulo": "Dañado"})
    assert corrupt.status_code == 202
    corrupt_job = await wait_for_job(client, corrupt.json()["data"]["jobId"], UPLOADER)
    assert corrupt_job["estado"] == "error" and corrupt_job["error"]["code"] == "CORRUPT_PDF"

    scanned = await upload(client, token=UPLOADER, pdf=make_pdf([[], []]), fields={"titulo": "Escaneado"})
    scanned_job = await wait_for_job(client, scanned.json()["data"]["jobId"], UPLOADER)
    assert scanned_job["estado"] == "error" and scanned_job["error"]["code"] == "NO_EXTRACTABLE_TEXT"

    assert await database.books.count_documents({}) == before

    retry = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(2), fields={"titulo": "Dañado"})
    assert retry.status_code == 202
    assert (await wait_for_job(client, retry.json()["data"]["jobId"], UPLOADER))["estado"] == "completado"


async def test_classification_and_search(client):
    _, by_category = await api(client, "/books?categoria=fantasia")
    assert by_category["total"] == 1, "categoría sin distinguir mayúsculas ni acentos"
    assert by_category["data"][0]["titulo"] == "El Libro de Prueba"

    assert (await api(client, "/books?busqueda=libro%20de%20prueba"))[1]["total"] == 1
    assert (await api(client, "/books?autor=ñandú"))[1]["total"] == 1
    assert (await api(client, "/books?busqueda=zzzz-no-existe"))[1]["total"] == 0

    # Caracteres de regex en la búsqueda se tratan como texto, no como patrón.
    status, injected = await api(client, "/books?busqueda=%28%5B")
    assert status == 200 and injected["total"] == 0

    assert (await api(client, "/books/categorias"))[1]["data"] == ["Aventura", "Fantasía"]

    _, paged = await api(client, "/books?limit=2&page=2")
    assert paged["limit"] == 2 and paged["page"] == 2
    assert len(paged["data"]) == 2
    assert paged["total"] > 2


async def test_edit_only_changes_metadata_and_delete_removes_the_book(client):
    _, found = await api(client, "/books?busqueda=Con%20hoja")
    book_id = found["data"][0]["_id"]

    status, edited = await api(
        client,
        f"/books/{book_id}",
        method="PUT",
        token=UPLOADER,
        json={"sinopsis": "Nueva sinopsis", "contenido_escaneado": [{"pagina": 1, "texto": "hackeado"}]},
    )
    assert status == 200
    assert edited["data"]["sinopsis"] == "Nueva sinopsis"
    assert "contenido_escaneado" not in edited["data"]
    assert (await api(client, f"/books/{book_id}/paginas/1"))[1]["data"]["texto"] == "primera"

    assert (await api(client, f"/books/{book_id}", method="DELETE", token=UPLOADER))[0] == 200
    assert (await api(client, f"/books/{book_id}"))[0] == 404


async def test_cover_is_validated_saved_on_disk_and_served(client, database, uploads_dir):
    jpeg = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + bytes([7]) * 64

    not_image = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(1), cover=(b"esto no es una imagen!", "image/jpeg"), fields={"titulo": "Portada falsa"})
    assert not_image.status_code == 415 and not_image.json()["code"] == "INVALID_COVER"

    huge = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(1), cover=(jpeg + bytes(600 * 1024), "image/jpeg"), fields={"titulo": "Portada enorme"})
    assert huge.status_code == 413 and huge.json()["code"] == "COVER_TOO_LARGE"

    sent = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(7), cover=(jpeg, "image/jpeg"), fields={"titulo": "Con portada"})
    assert sent.status_code == 202
    job = await wait_for_job(client, sent.json()["data"]["jobId"], UPLOADER)
    assert job["estado"] == "completado"

    _, detail = await api(client, f"/books/{job['libro_id']}")
    assert detail["data"]["tiene_portada"] is True
    assert "portada" not in detail["data"], "la imagen no viaja con los metadatos"
    _, listed = await api(client, "/books?busqueda=Con%20portada")
    assert listed["data"][0]["tiene_portada"] is True and "portada" not in listed["data"][0]

    cover = await client.get(f"/books/{job['libro_id']}/portada")
    assert cover.status_code == 200
    assert cover.headers["content-type"] == "image/jpeg"
    assert "max-age" in cover.headers["cache-control"]
    assert cover.content == jpeg

    # La imagen vive en disco; la base de datos solo guarda su nombre.
    stored = await database.books.find_one({"_id": ObjectId(job["libro_id"])}, {"portada": 1})
    assert stored["portada"]["archivo"] == f"{job['libro_id']}.jpg"
    assert "data" not in stored["portada"]
    cover_file = uploads_dir / "portadas" / stored["portada"]["archivo"]
    assert cover_file.exists()

    # Si el archivo desaparece, la ruta responde 404 y no 500.
    cover_file.unlink()
    assert (await client.get(f"/books/{job['libro_id']}/portada")).json()["code"] == "COVER_NOT_FOUND"

    # Libros anteriores: la imagen aún dentro del documento se sigue sirviendo.
    legacy = await make_book("Portada antigua", pages=1, portada={"data": jpeg, "mime": "image/jpeg"})
    legacy_cover = await client.get(f"/books/{legacy['_id']}/portada")
    assert legacy_cover.status_code == 200 and legacy_cover.content == jpeg

    # Al borrar el libro se borra también su imagen.
    second = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(9), cover=(jpeg, "image/jpeg"), fields={"titulo": "Portada que se borra"})
    second_job = await wait_for_job(client, second.json()["data"]["jobId"], UPLOADER)
    second_file = uploads_dir / "portadas" / f"{second_job['libro_id']}.jpg"
    assert second_file.exists()
    assert (await api(client, f"/books/{second_job['libro_id']}", method="DELETE", token=UPLOADER))[0] == 200
    assert not second_file.exists()

    # Sin portada: el catálogo lo indica y la ruta responde 404.
    bare = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(8), fields={"titulo": "Sin portada"})
    bare_job = await wait_for_job(client, bare.json()["data"]["jobId"], UPLOADER)
    assert (await api(client, f"/books/{bare_job['libro_id']}"))[1]["data"]["tiene_portada"] is False
    missing = await client.get(f"/books/{bare_job['libro_id']}/portada")
    assert missing.status_code == 404 and missing.json()["code"] == "COVER_NOT_FOUND"
    assert (await client.get(f"/books/{NO_ID}/portada")).json()["code"] == "BOOK_NOT_FOUND"


async def test_full_text_for_download_requires_session_and_is_ordered(client):
    book = await make_book(
        "Para descargar",
        contenido_escaneado=[
            {"pagina": 2, "texto": "segunda"},
            {"pagina": 1, "texto": "primera ñ"},
            {"pagina": 3, "texto": ""},
        ],
    )
    assert (await api(client, f"/books/{book['_id']}/texto"))[0] == 401

    status, body = await api(client, f"/books/{book['_id']}/texto", token=LECTOR)
    assert status == 200
    assert body["data"]["titulo"] == "Para descargar"
    assert body["data"]["total_paginas"] == 3
    assert body["data"]["paginas"] == [
        {"pagina": 1, "texto": "primera ñ"},
        {"pagina": 2, "texto": "segunda"},
        {"pagina": 3, "texto": ""},
    ]
    assert (await api(client, f"/books/{NO_ID}/texto", token=LECTOR))[0] == 404
    assert (await api(client, "/books/no-id/texto", token=LECTOR))[0] == 400


async def test_unknown_routes_and_invalid_json_use_uniform_format(client):
    res = await client.post("/books", headers={**auth(UPLOADER), "Content-Type": "application/json"}, content="{roto")
    assert res.status_code == 400
    assert res.json()["code"] == "INVALID_JSON"

    missing = await client.get("/no-existe")
    assert missing.status_code == 404
    assert missing.json()["success"] is False
    assert "Ruta no encontrada" in missing.json()["message"]


async def test_create_book_with_metadata_only(client):
    status, body = await api(
        client, "/books", method="POST", token=UPLOADER, json={"titulo": "Solo metadatos", "autores": ["Ana"], "categorias": "A, B"}
    )
    assert status == 201
    assert body["data"]["total_paginas"] == 0 and body["data"]["tiene_portada"] is False
    assert body["data"]["categorias"] == ["A", "B"]
    assert (await api(client, "/books", method="POST", token=UPLOADER, json={}))[1]["code"] == "INVALID_METADATA"
