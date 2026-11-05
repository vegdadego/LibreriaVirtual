"""Páginas en su propia colección, subida por fragmentos, cliente único de MongoDB y caracteres especiales
(ver docs/adr/0012-paginas-aparte-y-subida-por-fragmentos.md)."""

from __future__ import annotations

import asyncio
import unicodedata
from urllib.parse import quote

from bson import ObjectId

from app import db as app_db
from app.services import book_ingest, book_pages
from app.services.pdf_worker import clean_ocr_noise
from app.text_utils import clean_text, parse_list
from scripts.migrate_pages import migrate_database
from tests.conftest import auth, make_token
from tests.helpers.api import api, make_book, upload, wait_for_job
from tests.helpers.make_pdf import make_numbered_pdf, make_pdf

UPLOADER = make_token("uploader")
ADMIN = make_token("admin")


# --- Páginas por lotes -----------------------------------------------------------------------


def test_split_batches_respects_page_and_size_limits():
    small = [{"pagina": n, "texto": "x"} for n in range(1, 251)]
    assert [len(batch) for batch in book_pages.split_batches(small)] == [100, 100, 50]

    big = [{"pagina": n, "texto": "y" * (900 * 1024)} for n in range(1, 6)]
    assert [len(batch) for batch in book_pages.split_batches(big)] == [2, 2, 1]

    assert book_pages.split_batches([]) == []
    giant = [{"pagina": 1, "texto": "z" * (3 * 1024 * 1024)}]
    assert book_pages.split_batches(giant) == [giant], "una página más grande que el lote va sola"


async def test_a_long_book_is_stored_in_batches_and_read_back_in_order(client, database):
    book = await make_book("Libro largo", pages=250)
    stored = await database.books.find_one({"_id": book["_id"]})
    assert "contenido_escaneado" not in stored and stored["total_paginas"] == 250
    assert await database.book_pages.count_documents({"libro": book["_id"]}) == 250

    _, detail = await api(client, f"/books/{book['_id']}")
    assert detail["data"]["total_paginas"] == 250

    _, last = await api(client, f"/books/{book['_id']}/paginas/250")
    assert last["data"]["texto"] == "texto 250" and last["data"]["siguiente"] is None and last["data"]["anterior"] == 249
    status, beyond = await api(client, f"/books/{book['_id']}/paginas/251")
    assert status == 404 and beyond["code"] == "PAGE_NOT_FOUND" and beyond["total_paginas"] == 250

    _, full = await api(client, f"/books/{book['_id']}/texto", token=ADMIN)
    assert [p["pagina"] for p in full["data"]["paginas"]] == list(range(1, 251))


async def test_the_unique_index_rejects_a_repeated_page(database):
    book_id = ObjectId()
    await book_pages.insert_pages(book_id, [{"pagina": 1, "texto": "a"}])
    try:
        await book_pages.insert_pages(book_id, [{"pagina": 1, "texto": "otra"}])
    except Exception as error:  # noqa: BLE001 — BulkWriteError (clave duplicada)
        assert "E11000" in str(error) or "duplicate" in str(error).lower()
    else:
        raise AssertionError("debía rechazar la página repetida")
    await book_pages.delete_pages(book_id)


async def test_a_failed_save_leaves_no_pages_behind(database, monkeypatch):
    class FailingBooks:
        def __init__(self, real):
            self._real = real

        async def insert_one(self, *args, **kwargs):
            raise RuntimeError("la base de datos falló")

        def __getattr__(self, name):
            return getattr(self._real, name)

    class DbProxy:
        def __init__(self, real):
            self._real = real
            self.books = FailingBooks(real.books)

        def __getattr__(self, name):
            return getattr(self._real, name)

    before = await database.book_pages.count_documents({})
    monkeypatch.setattr(book_ingest, "get_db", lambda: DbProxy(app_db.get_db()))
    pages = [{"pagina": n, "texto": f"texto {n}"} for n in range(1, 151)]
    try:
        await book_ingest.save_book_with_pages({"titulo": "Se cae al guardar"}, pages)
    except RuntimeError:
        pass
    else:
        raise AssertionError("debía fallar")
    assert await database.book_pages.count_documents({}) == before, "las páginas ya escritas se borran"


async def test_deleting_a_book_deletes_its_pages(client, database):
    book = await make_book("Para borrar", pages=12)
    assert await database.book_pages.count_documents({"libro": book["_id"]}) == 12
    status, _ = await api(client, f"/books/{book['_id']}", method="DELETE", token=ADMIN)
    assert status == 200
    assert await database.book_pages.count_documents({"libro": book["_id"]}) == 0


async def test_older_books_still_work_and_can_be_migrated(client, database):
    legacy = await make_book(
        "Libro antiguo",
        contenido_escaneado=[{"pagina": 2, "texto": "dos"}, {"pagina": 1, "texto": "uno"}],
    )
    _, page = await api(client, f"/books/{legacy['_id']}/paginas/2")
    assert page["data"]["texto"] == "dos" and page["data"]["total_paginas"] == 2
    _, listing = await api(client, "/books?busqueda=antiguo")
    assert listing["data"][0]["total_paginas"] == 2

    orphan = ObjectId()
    await book_pages.insert_pages(orphan, [{"pagina": 1, "texto": "huérfana"}])

    migrated, removed = await migrate_database(database)
    assert (migrated, removed) == (1, 0)
    stored = await database.books.find_one({"_id": legacy["_id"]})
    assert "contenido_escaneado" not in stored and stored["total_paginas"] == 2 and stored["inicio_contenido"] == 0
    assert await database.book_pages.count_documents({"libro": legacy["_id"]}) == 2

    _, page = await api(client, f"/books/{legacy['_id']}/paginas/1")
    assert page["data"]["texto"] == "uno" and page["data"]["total_paginas"] == 2
    _, full = await api(client, f"/books/{legacy['_id']}/texto", token=ADMIN)
    assert [p["texto"] for p in full["data"]["paginas"]] == ["uno", "dos"]

    assert await migrate_database(database) == (0, 0), "repetirlo no hace nada"
    assert await migrate_database(database, orphans=True) == (0, 1), "borra solo las páginas sin libro"
    assert await database.book_pages.count_documents({"libro": orphan}) == 0
    assert await database.book_pages.count_documents({"libro": legacy["_id"]}) == 2


async def test_the_mongo_client_is_a_single_shared_instance(database):
    client_before = app_db._client
    assert await app_db.connect() is app_db.get_db(), "conectar de nuevo reutiliza la conexión abierta"
    assert app_db._client is client_before
    assert client_before.options.pool_options.max_pool_size == 20


# --- Subida por fragmentos -------------------------------------------------------------------


async def start_chunks(client, token, size, name="libro.pdf"):
    return await client.post("/books/stage/uploads", headers=auth(token), json={"nombre": name, "tamano": size})


async def put_chunk(client, token, upload_id, index, data):
    return await client.put(
        f"/books/stage/uploads/{upload_id}/{index}",
        headers={**auth(token), "Content-Type": "application/octet-stream"},
        content=data,
    )


async def wait_stage(client, token, stage_id):
    for _ in range(400):
        _, body = await api(client, f"/books/stage/{stage_id}", token=token)
        if body["data"]["estado"] != "leyendo":
            return body["data"]
        await asyncio.sleep(0.025)
    raise AssertionError("La lectura no terminó")


async def test_a_pdf_uploaded_in_chunks_becomes_a_book(client, database, monkeypatch):
    monkeypatch.setenv("UPLOAD_CHUNK_KB", "1")
    owner = make_token("uploader")
    pdf = make_numbered_pdf(48)

    started = await start_chunks(client, owner, len(pdf))
    assert started.status_code == 201
    info = started.json()["data"]
    assert info["tamano_fragmento"] == 1024 and info["total_fragmentos"] == -(-len(pdf) // 1024) > 3
    parts = [pdf[i : i + 1024] for i in range(0, len(pdf), 1024)]

    # Llegan a la vez y desordenados, y uno se repite (un reintento).
    order = list(reversed(range(len(parts))))
    results = await asyncio.gather(*(put_chunk(client, owner, info["uploadId"], i, parts[i]) for i in order))
    assert all(r.status_code == 200 for r in results)
    again = await put_chunk(client, owner, info["uploadId"], 0, parts[0])
    assert again.json()["data"] == {"recibidos": len(parts), "total_fragmentos": len(parts)}

    done = await client.post(f"/books/stage/uploads/{info['uploadId']}/complete", headers=auth(owner))
    assert done.status_code == 201, done.text
    stage = done.json()["data"]
    assert stage["stageId"] and stage["analisis"] and stage["portada"]["mime"] == "image/jpeg"
    assert (await wait_stage(client, owner, stage["stageId"]))["estado"] == "listo"

    sent = await upload(client, token=owner, fields={"stage_id": stage["stageId"], "titulo": "Subido por fragmentos"})
    job = await wait_for_job(client, sent.json()["data"]["jobId"], owner)
    assert job["estado"] == "completado"
    _, page = await api(client, f"/books/{job['libro_id']}/paginas/48")
    assert "Página 48" in page["data"]["texto"] and page["data"]["total_paginas"] == 48

    # La subida se consumió: cerrarla otra vez ya no existe.
    again = await client.post(f"/books/stage/uploads/{info['uploadId']}/complete", headers=auth(owner))
    assert again.status_code == 404 and again.json()["code"] == "UPLOAD_NOT_FOUND"


async def test_chunked_upload_errors(client, monkeypatch):
    monkeypatch.setenv("UPLOAD_CHUNK_KB", "1")
    owner = make_token("uploader")
    pdf = make_numbered_pdf(10)
    parts = [pdf[i : i + 1024] for i in range(0, len(pdf), 1024)]

    assert (await start_chunks(client, make_token("lector"), len(pdf))).status_code == 403
    assert (await start_chunks(client, None, len(pdf))).status_code == 401
    zero = await start_chunks(client, owner, 0)
    assert zero.status_code == 400 and zero.json()["code"] == "INVALID_UPLOAD"
    huge = await start_chunks(client, owner, 5 * 1024 * 1024)
    assert huge.status_code == 413 and huge.json()["code"] == "FILE_TOO_LARGE"

    info = (await start_chunks(client, owner, len(pdf))).json()["data"]
    upload_id = info["uploadId"]
    wrong_size = await put_chunk(client, owner, upload_id, 0, parts[0][:-1])
    assert wrong_size.status_code == 400 and wrong_size.json()["code"] == "INVALID_CHUNK"
    out_of_range = await put_chunk(client, owner, upload_id, len(parts), parts[0])
    assert out_of_range.status_code == 400 and out_of_range.json()["code"] == "INVALID_CHUNK"
    oversized = await put_chunk(client, owner, upload_id, 0, bytes(2048))
    assert oversized.status_code == 413
    stranger = await put_chunk(client, make_token("uploader"), upload_id, 0, parts[0])
    assert stranger.status_code == 404 and stranger.json()["code"] == "UPLOAD_NOT_FOUND"

    await put_chunk(client, owner, upload_id, 0, parts[0])
    incomplete = await client.post(f"/books/stage/uploads/{upload_id}/complete", headers=auth(owner))
    assert incomplete.status_code == 409 and incomplete.json()["code"] == "INCOMPLETE_UPLOAD"
    assert incomplete.json()["faltan"] == list(range(1, len(parts)))

    # Empezar otra subida descarta la anterior.
    replacement = (await start_chunks(client, owner, len(pdf))).json()["data"]
    assert (await put_chunk(client, owner, upload_id, 1, parts[1])).status_code == 404

    # Un archivo que no es PDF se rechaza desde su primer fragmento.
    text = (await start_chunks(client, owner, 10)).json()["data"]
    not_pdf = await put_chunk(client, owner, text["uploadId"], 0, b"hola mundo")
    assert not_pdf.status_code == 415 and not_pdf.json()["code"] == "INVALID_FILE"

    # Cancelar es idempotente.
    cancel = await client.delete(f"/books/stage/uploads/{replacement['uploadId']}", headers=auth(owner))
    assert cancel.status_code == 200
    cancel = await client.delete(f"/books/stage/uploads/{replacement['uploadId']}", headers=auth(owner))
    assert cancel.status_code == 200


# --- Caracteres especiales -------------------------------------------------------------------

SPECIAL_TITLE = "¿Qué es «C++»? & #1 – O'Brien/100% <b>\"x\"</b> 日本語 😀 ñandú"


def test_clean_text_keeps_special_characters_and_removes_only_control_ones():
    assert clean_text(SPECIAL_TITLE) == SPECIAL_TITLE
    assert clean_text("  Café  ") == "Café" == unicodedata.normalize("NFC", "Café")
    assert clean_text("A\x00B\x07C\x7f") == "ABC"
    assert clean_text("Dos\nlíneas\tjuntas") == "Dos líneas juntas"
    assert clean_text("Uno\r\ndos\n\ntres", multiline=True) == "Uno\ndos\n\ntres"
    assert clean_text("roto \ud83d fin") == "roto ? fin", "un sustituto suelto no se puede codificar"


def test_parse_list_keeps_commas_inside_names_when_a_semicolon_separates_them():
    assert parse_list("García Márquez, Gabriel; Tolkien, J. R. R.") == ["García Márquez, Gabriel", "Tolkien, J. R. R."]
    assert parse_list("Ana\nLuis; Eva") == ["Ana", "Luis", "Eva"]
    assert parse_list("Ana Pérez, Luis Gómez") == ["Ana Pérez", "Luis Gómez"], "sin ';' se sigue separando por comas"
    assert parse_list('["Smith, John", "O\'Brien"]') == ["Smith, John", "O'Brien"]


def test_bullets_and_symbols_survive_the_noise_filter():
    text = "● Uno\n○ Dos ▪ tres\n◆ cuatro ▶ ★ ♥ → ∑ ± ≠ © ®"
    assert clean_ocr_noise(text) == text
    assert clean_ocr_noise("Hola ■ mundo�") == "Hola  mundo"


async def test_a_book_with_special_characters_can_be_uploaded_found_and_read(client, database):
    fields = {
        "titulo": SPECIAL_TITLE,
        "autores": "Gómez de la Serna, Ramón; O'Brien, Flann",
        "categorias": "Ciencia ficción, Aventura",
        "empresa_edicion": "Alfaguara & Hijos, S.A.",
        "sinopsis": "Línea uno: «cita» – ¿sí?\nLínea dos con emoji 😀 y 100% de símbolos <&>.",
        "idioma": "es",
    }
    sent = await upload(client, token=UPLOADER, pdf=make_pdf([["Símbolos: ± © ® ½ ñ « » ¿ ¡ § ¶ & # < >"]]), fields=fields)
    assert sent.status_code == 202, sent.text
    job = await wait_for_job(client, sent.json()["data"]["jobId"], UPLOADER)
    assert job["estado"] == "completado", job

    _, detail = await api(client, f"/books/{job['libro_id']}")
    book = detail["data"]
    assert book["titulo"] == SPECIAL_TITLE
    assert [a["nombre"] for a in book["autores"]] == ["Gómez de la Serna, Ramón", "O'Brien, Flann"]
    assert book["empresa_edicion"] == "Alfaguara & Hijos, S.A."
    assert book["sinopsis"] == fields["sinopsis"]

    _, page = await api(client, f"/books/{job['libro_id']}/paginas/1")
    assert "± © ® ½ ñ « » ¿ ¡ § ¶ & # < >" in page["data"]["texto"]

    for query in ("C%2B%2B", quote("#1"), "O%27Brien", "100%25", quote("«C++»"), quote("日本語"), quote("<b>")):
        _, found = await api(client, f"/books?busqueda={query}")
        assert found["total"] == 1, query

    other = await upload(client, token=UPLOADER, pdf=make_numbered_pdf(49), fields={"titulo": SPECIAL_TITLE.upper()})
    assert other.status_code == 409 and other.json()["code"] == "DUPLICATE_BOOK", "se reconoce aunque cambien mayúsculas"


async def test_titles_are_normalised_and_control_only_titles_are_rejected(client, database):
    created = await client.post("/books", headers=auth(UPLOADER), json={"titulo": "  Café\x00 \n del día  "})
    assert created.status_code == 201
    assert created.json()["data"]["titulo"] == "Café del día"

    empty = await client.post("/books", headers=auth(UPLOADER), json={"titulo": "\x00\x07"})
    assert empty.status_code == 400 and empty.json()["code"] == "INVALID_METADATA"

    broken = await client.post(
        "/books",
        headers={**auth(UPLOADER), "Content-Type": "application/json"},
        content=b'{"titulo": "Roto \\ud83d fin"}',
    )
    assert broken.status_code < 500
