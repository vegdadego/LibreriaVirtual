"""Carpetas de libros (port de `server/test/folders.test.js`)."""

from __future__ import annotations

from tests.conftest import make_token
from tests.helpers.api import api, make_book

ALICE = make_token("lector")
BOB = make_token("lector")
ADMIN = make_token("admin")
NO_ID = "64b000000000000000000000"


async def create_folder(client, json, token=ALICE):
    return await api(client, "/me/carpetas", method="POST", token=token, json=json)


async def test_folders_are_created_validated_and_private(client):
    libro = await make_book("En carpeta uno")

    assert (await api(client, "/me/carpetas"))[0] == 401
    assert (await create_folder(client, {"nombre": "   "}))[1]["code"] == "INVALID_FOLDER"
    assert (await create_folder(client, {}))[1]["code"] == "INVALID_FOLDER"
    assert (await create_folder(client, {"nombre": "x" * 81}))[1]["code"] == "INVALID_FOLDER"
    fake = await create_folder(client, {"nombre": "Con libro falso", "libro_id": NO_ID})
    assert fake[1]["code"] == "BOOK_NOT_FOUND"

    status, created = await create_folder(
        client, {"nombre": "Para el verano", "descripcion": "Lecturas ligeras", "libro_id": str(libro["_id"])}
    )
    assert status == 201
    assert created["data"]["total_libros"] == 1
    assert created["data"]["libro_ids"] == [str(libro["_id"])]
    assert created["data"]["previews"][0]["titulo"] == "En carpeta uno"
    folder_id = created["data"]["_id"]

    status, dup = await create_folder(client, {"nombre": "para el VERANO"})
    assert status == 409 and dup["code"] == "DUPLICATE_FOLDER"
    assert (await create_folder(client, {"nombre": "Para el verano"}, BOB))[0] == 201  # otro usuario puede repetir el nombre

    _, listing = await api(client, "/me/carpetas", token=ALICE)
    assert listing["total"] == 1
    assert listing["data"][0]["nombre"] == "Para el verano"

    # Privacidad: bob no ve ni toca la carpeta de alice.
    attempts = [("GET", ""), ("PUT", ""), ("DELETE", ""), ("PUT", f"/libros/{libro['_id']}"), ("DELETE", f"/libros/{libro['_id']}")]
    for method, suffix in attempts:
        status, body = await api(
            client,
            f"/me/carpetas/{folder_id}{suffix}",
            method=method,
            token=BOB,
            json={"nombre": "robada"} if method == "PUT" and not suffix else None,
        )
        assert status == 404, f"{method} {suffix}"
        assert body["code"] == "FOLDER_NOT_FOUND"
    assert (await api(client, "/me/carpetas/no-id", token=ALICE))[1]["code"] == "INVALID_ID"


async def test_add_order_remove_books_edit_and_delete_folder(client, database):
    a = await make_book("Orden A")
    b = await make_book("Orden B")
    _, created = await create_folder(client, {"nombre": "Orden"})
    path = f"/me/carpetas/{created['data']['_id']}"

    async def put(suffix):
        return await api(client, f"{path}{suffix}", method="PUT", token=ALICE)

    assert (await put(f"/libros/{b['_id']}"))[1]["data"]["total_libros"] == 1
    assert (await put(f"/libros/{a['_id']}"))[1]["data"]["total_libros"] == 2
    assert (await put(f"/libros/{a['_id']}"))[1]["data"]["total_libros"] == 2  # no se duplica
    assert (await put(f"/libros/{NO_ID}"))[1]["code"] == "BOOK_NOT_FOUND"

    _, detail = await api(client, path, token=ALICE)
    assert [x["titulo"] for x in detail["data"]["libros"]] == ["Orden B", "Orden A"]  # en el orden en que se añadieron
    assert detail["data"]["libros"][0]["total_paginas"] == 5
    assert "contenido_escaneado" not in detail["data"]["libros"][0]

    _, renamed = await api(client, path, method="PUT", token=ALICE, json={"nombre": "Orden nuevo", "descripcion": "otra"})
    assert renamed["data"]["nombre"] == "Orden nuevo"
    assert renamed["data"]["total_libros"] == 2, "renombrar conserva los libros"
    assert (await api(client, path, method="PUT", token=ALICE, json={"nombre": ""}))[1]["code"] == "INVALID_FOLDER"

    async def delete(suffix):
        return await api(client, f"{path}{suffix}", method="DELETE", token=ALICE)

    assert (await delete(f"/libros/{b['_id']}"))[1]["data"]["total_libros"] == 1
    assert (await delete(f"/libros/{b['_id']}"))[1]["data"]["total_libros"] == 1  # quitar dos veces no falla

    assert (await delete(""))[0] == 200
    assert (await api(client, path, token=ALICE))[0] == 404
    assert await database.books.find_one({"_id": a["_id"]}), "borrar la carpeta no borra los libros"


async def test_deleting_a_book_removes_it_from_folders(client):
    libro = await make_book("Libro en dos carpetas")
    one = (await create_folder(client, {"nombre": "Limpieza 1", "libro_id": str(libro["_id"])}))[1]["data"]["_id"]
    two = (await create_folder(client, {"nombre": "Limpieza 2", "libro_id": str(libro["_id"])}))[1]["data"]["_id"]

    assert (await api(client, f"/books/{libro['_id']}", method="DELETE", token=ADMIN))[0] == 200

    for folder_id in (one, two):
        _, body = await api(client, f"/me/carpetas/{folder_id}", token=ALICE)
        assert body["data"]["total_libros"] == 0
        assert body["data"]["libros"] == []
