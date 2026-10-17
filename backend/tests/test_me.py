"""Guardados y progreso de lectura (port de `server/test/me.test.js`)."""

from __future__ import annotations

from bson import ObjectId

from tests.conftest import make_token
from tests.helpers.api import api, make_book

ALICE_ID = str(ObjectId())
BOB_ID = str(ObjectId())
ALICE = make_token("lector", ALICE_ID)
BOB = make_token("lector", BOB_ID)
NO_ID = "64b000000000000000000000"


async def test_me_requires_session(client):
    for path in ("/me/estado", "/me/guardados", "/me/progreso"):
        status, body = await api(client, path)
        assert status == 401, path
        assert body["code"] == "UNAUTHENTICATED"
    assert (await api(client, f"/me/guardados/{NO_ID}", method="PUT"))[0] == 401


async def test_save_and_unsave_are_idempotent_and_personal(client, database):
    uno = await make_book("Guardable uno")
    dos = await make_book("Guardable dos")

    assert (await api(client, f"/me/guardados/{uno['_id']}", method="PUT", token=ALICE))[0] == 200
    assert (await api(client, f"/me/guardados/{uno['_id']}", method="PUT", token=ALICE))[0] == 200  # repetir no falla
    assert (await api(client, f"/me/guardados/{dos['_id']}", method="PUT", token=ALICE))[0] == 200
    assert await database.user_books.count_documents({"usuario": ObjectId(ALICE_ID), "libro": uno["_id"]}) == 1

    _, listing = await api(client, "/me/guardados", token=ALICE)
    assert listing["total"] == 2
    assert [b["titulo"] for b in listing["data"]] == ["Guardable dos", "Guardable uno"]  # el último guardado primero
    assert listing["data"][0]["total_paginas"] == 5
    assert "contenido_escaneado" not in listing["data"][0]
    assert listing["data"][0]["tiene_portada"] is False

    assert (await api(client, "/me/guardados", token=BOB))[1]["total"] == 0  # cada usuario ve lo suyo

    _, state = await api(client, "/me/estado", token=ALICE)
    assert set(state["data"]["guardados"]) == {str(uno["_id"]), str(dos["_id"])}

    assert (await api(client, f"/me/guardados/{uno['_id']}", method="DELETE", token=ALICE))[0] == 200
    assert (await api(client, f"/me/guardados/{uno['_id']}", method="DELETE", token=ALICE))[0] == 200
    assert (await api(client, "/me/guardados", token=ALICE))[1]["total"] == 1

    assert (await api(client, f"/me/guardados/{NO_ID}", method="PUT", token=ALICE))[1]["code"] == "BOOK_NOT_FOUND"
    assert (await api(client, "/me/guardados/no-es-id", method="PUT", token=ALICE))[1]["code"] == "INVALID_ID"


async def test_progress_validates_page_updates_and_feeds_continue_reading(client, database):
    libro = await make_book("Con progreso", 10)
    otro = await make_book("Otro progreso", 4)

    async def put(book_id, pagina, token=ALICE):
        return await api(client, f"/me/progreso/{book_id}", method="PUT", token=token, json={"pagina": pagina})

    assert (await put(libro["_id"], 0))[1]["code"] == "INVALID_PAGE"
    assert (await put(libro["_id"], "x"))[1]["code"] == "INVALID_PAGE"
    status, too_far = await put(libro["_id"], 11)
    assert status == 400 and too_far["total_paginas"] == 10
    assert (await put(NO_ID, 1))[1]["code"] == "BOOK_NOT_FOUND"

    assert (await put(libro["_id"], 3))[1]["data"]["pagina_actual"] == 3
    assert (await put(otro["_id"], 2))[0] == 200
    assert (await put(libro["_id"], 7))[1]["data"]["pagina_actual"] == 7  # se sobrescribe
    assert await database.user_books.count_documents({"usuario": ObjectId(ALICE_ID), "libro": libro["_id"]}) == 1

    _, progress = await api(client, "/me/progreso", token=ALICE)
    assert [[b["titulo"], b["pagina_actual"]] for b in progress["data"]] == [["Con progreso", 7], ["Otro progreso", 2]]
    assert progress["data"][0]["total_paginas"] == 10
    assert (await api(client, "/me/progreso", token=BOB))[1]["total"] == 0

    _, state = await api(client, "/me/estado", token=ALICE)
    entry = next(p for p in state["data"]["progreso"] if p["libro_id"] == str(libro["_id"]))
    assert entry["pagina_actual"] == 7


async def test_unsaving_keeps_progress_and_deleting_the_book_cleans_everything(client, database):
    libro = await make_book("Se va a borrar", 3)
    await api(client, f"/me/guardados/{libro['_id']}", method="PUT", token=ALICE)
    await api(client, f"/me/progreso/{libro['_id']}", method="PUT", token=ALICE, json={"pagina": 2})

    await api(client, f"/me/guardados/{libro['_id']}", method="DELETE", token=ALICE)
    _, kept = await api(client, "/me/progreso", token=ALICE)
    assert any(b["titulo"] == "Se va a borrar" for b in kept["data"]), "el progreso sigue"

    uploader = make_token("uploader")
    assert (await api(client, f"/books/{libro['_id']}", method="DELETE", token=uploader))[0] == 200
    assert await database.user_books.count_documents({"libro": libro["_id"]}) == 0, "no quedan referencias"
    _, after = await api(client, "/me/progreso", token=ALICE)
    assert not any(b["titulo"] == "Se va a borrar" for b in after["data"])
