"""Registro, inicio de sesión, tokens y rutas heredadas (autores, sagas, usuarios)."""

from __future__ import annotations

import bcrypt
import jwt

from tests.conftest import make_token
from tests.helpers.api import api

ADMIN = make_token("admin")
UPLOADER = make_token("uploader")
LECTOR = make_token("lector")
SECRET = "secreto-de-pruebas-con-longitud-suficiente"


async def test_register_login_and_current_user(client):
    status, registered = await api(
        client,
        "/auth/register",
        method="POST",
        json={"nombre_usuario": "  Ana  ", "correo": "ANA@Correo.com", "password": "Clave12345", "tipo_usuario": "uploader"},
    )
    assert status == 201 and registered["success"] is True
    assert registered["user"]["nombre_usuario"] == "Ana"
    assert registered["user"]["correo"] == "ana@correo.com"
    assert registered["user"]["rol"] == "uploader"

    # El token lleva el mismo contenido que emitía el backend en Node.
    claims = jwt.decode(registered["token"], SECRET, algorithms=["HS256"])
    assert claims["id"] == registered["user"]["id"]
    assert claims["tipo_usuario"] == "uploader" and claims["nombre_usuario"] == "Ana"
    assert claims["exp"] - claims["iat"] == 7 * 24 * 3600

    for identifier in ("ana@correo.com", "Ana"):
        status, login = await api(client, "/auth/login", method="POST", json={"email": identifier, "password": "Clave12345"})
        assert status == 200, identifier
        assert login["user"]["tipo_usuario"] == "uploader" and login["token"]

    status, me = await api(client, "/auth/me", token=login["token"])
    assert status == 200 and me["user"]["correo"] == "ana@correo.com"
    assert "password_hash" not in me["user"]

    assert (await api(client, "/auth/me"))[0] == 401
    assert (await api(client, "/auth/me", token="no-es-un-token"))[1]["message"] == "Token inválido o expirado."
    assert (await api(client, "/auth/logout", method="POST"))[1]["success"] is True


async def test_register_and_login_errors(client):
    async def register(**body):
        return await api(client, "/auth/register", method="POST", json=body)

    assert (await register(nombre_usuario="x", correo="x@x.com"))[0] == 400  # falta la contraseña
    assert (await register(nombre_usuario="Beto", correo="no-es-correo", password="Clave12345"))[1]["message"] == "Por favor ingresa un correo válido"

    ok, _ = await register(nombre_usuario="Beto", correo="beto@correo.com", password="Clave12345")
    assert ok == 201
    status, dup = await register(nombre_usuario="Otro", correo="BETO@correo.com", password="Clave12345")
    assert status == 400 and "ya se encuentra registrado" in dup["message"]

    # Nadie puede darse de alta como admin desde el registro público.
    status, admin = await register(nombre_usuario="Mal", correo="mal@correo.com", password="Clave12345", tipo_usuario="admin")
    assert status == 400

    assert (await api(client, "/auth/login", method="POST", json={"email": "beto@correo.com"}))[0] == 400
    assert (await api(client, "/auth/login", method="POST", json={"email": "nadie@correo.com", "password": "x"}))[0] == 401
    status, wrong = await api(client, "/auth/login", method="POST", json={"email": "beto@correo.com", "password": "mala"})
    assert status == 401 and wrong["message"] == "Contraseña incorrecta."


async def test_login_accepts_hashes_created_by_the_old_node_backend(client, database):
    """Los hashes de bcryptjs (`$2a$`/`$2b$`) de usuarios ya registrados siguen valiendo."""
    node_style = bcrypt.hashpw(b"ClaveVieja1", bcrypt.gensalt(rounds=10, prefix=b"2a")).decode()
    assert node_style.startswith("$2a$")
    await database.users.insert_one(
        {"nombre_usuario": "Vieja", "correo": "vieja@correo.com", "password_hash": node_style, "tipo_usuario": "lector"}
    )
    status, body = await api(client, "/auth/login", method="POST", json={"correo": "vieja@correo.com", "password": "ClaveVieja1"})
    assert status == 200 and body["user"]["nombre_usuario"] == "Vieja"


async def test_legacy_catalogs_authors_and_sagas(client):
    # Lectura pública; escritura solo uploader/admin.
    assert (await api(client, "/authors"))[0] == 200
    assert (await api(client, "/authors", method="POST", json={"nombre": "Ana"}))[0] == 401
    assert (await api(client, "/authors", method="POST", token=LECTOR, json={"nombre": "Ana"}))[0] == 403

    status, created = await api(client, "/authors", method="POST", token=UPLOADER, json={"nombre": "  Ursula  ", "nacionalidad": "EE. UU."})
    assert status == 201 and created["data"]["nombre"] == "Ursula" and created["data"]["biografia"] == ""
    author_id = created["data"]["_id"]
    assert (await api(client, "/authors", method="POST", token=UPLOADER, json={"nombre": "Ursula"}))[0] == 400  # único
    assert (await api(client, "/authors", method="POST", token=UPLOADER, json={}))[1]["message"] == "El nombre del autor es obligatorio"

    assert (await api(client, f"/authors/{author_id}"))[1]["data"]["nacionalidad"] == "EE. UU."
    assert (await api(client, f"/authors/{author_id}", method="PUT", token=UPLOADER, json={"biografia": "Escritora"}))[1]["data"]["biografia"] == "Escritora"
    assert (await api(client, "/authors/no-id"))[0] == 400
    assert (await api(client, f"/authors/{author_id}", method="DELETE", token=UPLOADER))[0] == 200
    assert (await api(client, f"/authors/{author_id}"))[0] == 404

    status, saga = await api(client, "/sagas", method="POST", token=UPLOADER, json={"nombre": "Terramar"})
    assert status == 201
    assert saga["data"]["estado"] == "En emisión" and saga["data"]["libros_totales"] == 0
    assert (await api(client, "/sagas", method="POST", token=UPLOADER, json={"nombre": "Otra", "estado": "Rota"}))[0] == 400
    assert (await api(client, "/sagas", method="POST", token=UPLOADER, json={"nombre": "Otra", "libros_totales": -1}))[0] == 400


async def test_users_crud_is_admin_only(client):
    assert (await api(client, "/users"))[0] == 401
    assert (await api(client, "/users", token=UPLOADER))[0] == 403

    status, created = await api(
        client, "/users", method="POST", token=ADMIN,
        json={"nombre_usuario": "Gestionado", "correo": "g@correo.com", "password": "Clave12345", "tipo_usuario": "lector"},
    )
    assert status == 201 and "password_hash" not in created["data"]
    user_id = created["data"]["_id"]

    _, listing = await api(client, "/users", token=ADMIN)
    assert all("password_hash" not in user for user in listing["data"])

    # La contraseña se guarda con bcrypt y sirve para iniciar sesión.
    assert (await api(client, "/auth/login", method="POST", json={"email": "g@correo.com", "password": "Clave12345"}))[0] == 200
    assert (await api(client, f"/users/{user_id}", method="PUT", token=ADMIN, json={"tipo_usuario": "uploader"}))[1]["data"]["tipo_usuario"] == "uploader"
    assert (await api(client, f"/users/{user_id}", method="DELETE", token=ADMIN))[0] == 200
    assert (await api(client, f"/users/{user_id}", token=ADMIN))[0] == 404
