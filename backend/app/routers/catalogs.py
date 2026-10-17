"""Routers de autores, sagas y usuarios (colecciones heredadas del proyecto anterior).

- Autores y sagas: la lectura es pública; crear, editar y borrar exige `uploader` o `admin`.
- Usuarios: todo exige `admin` (antes estaba abierto a cualquiera).
"""

from __future__ import annotations

import re

from fastapi import Depends

from ..http import utcnow
from ..security import admin_only, can_write, hash_password
from .simple_crud import Field, make_crud_router
from ..errors import LegacyError

EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")

authors_router = make_crud_router(
    collection="authors",
    fields=[
        Field("nombre", required=True, message="El nombre del autor es obligatorio"),
        Field("biografia", default=""),
        Field("nacionalidad", default=""),
    ],
    labels={
        "not_found": "Autor no encontrado",
        "created": "Autor registrado exitosamente",
        "updated": "Autor actualizado exitosamente",
        "deleted": "Autor eliminado exitosamente",
    },
    sort=("nombre", 1),
    write_dependencies=[Depends(can_write)],
    duplicate_message="Ya existe un autor con ese nombre",
)

sagas_router = make_crud_router(
    collection="sagas",
    fields=[
        Field("nombre", required=True, message="El nombre de la saga es obligatorio"),
        Field("descripcion", default=""),
        Field("estado", kind="enum", choices=("Finalizada", "En emisión", "Pausada", "Cancelada"), default="En emisión"),
        Field("libros_totales", kind="number", default=0, minimum=0),
    ],
    labels={
        "not_found": "Saga no encontrada",
        "created": "Saga creada exitosamente",
        "updated": "Saga actualizada exitosamente",
        "deleted": "Saga eliminada exitosamente",
    },
    sort=("nombre", 1),
    write_dependencies=[Depends(can_write)],
    duplicate_message="Ya existe una saga con ese nombre",
)


def _prepare_user(document: dict, body: dict, partial: bool) -> dict:
    """Convierte `password` en `password_hash` (bcrypt); acepta un `password_hash` ya calculado."""
    password = body.get("password")
    if isinstance(password, str) and password:
        document["password_hash"] = hash_password(password)
    elif isinstance(body.get("password_hash"), str) and body["password_hash"]:
        document["password_hash"] = body["password_hash"]
    elif not partial:
        raise LegacyError(400, "La contraseña es obligatoria")
    if not partial:
        document.setdefault("fecha_registro", utcnow())
    return document


users_router = make_crud_router(
    collection="users",
    fields=[
        Field("nombre_usuario", required=True, message="El nombre de usuario es obligatorio"),
        Field(
            "correo",
            required=True,
            lower=True,
            message="Por favor ingresa un correo válido",
            check=lambda value: bool(EMAIL_PATTERN.match(value)),
        ),
        Field("tipo_usuario", kind="enum", choices=("uploader", "lector", "admin"), default="lector"),
    ],
    labels={
        "not_found": "Usuario no encontrado",
        "created": "Usuario registrado exitosamente",
        "updated": "Usuario actualizado exitosamente",
        "deleted": "Usuario eliminado exitosamente",
    },
    sort=("fecha_registro", -1),
    hidden=("password_hash",),
    write_dependencies=[Depends(admin_only)],
    read_dependencies=[Depends(admin_only)],
    prepare=_prepare_user,
    duplicate_message="El nombre de usuario o correo ya se encuentra registrado.",
)
