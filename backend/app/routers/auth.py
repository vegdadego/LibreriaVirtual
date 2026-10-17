"""/api/v1/auth — registro, inicio de sesión y sesión actual (respuestas `{success, message}`)."""

from __future__ import annotations

import re
from typing import Any

import jwt
from bson import ObjectId
from fastapi import APIRouter, Request
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..errors import LegacyError
from ..http import json_body, utcnow
from ..security import create_token, decode_token, hash_password, verify_password
from ..serialize import ApiResponse

router = APIRouter()

EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")
#: Con el registro público solo se elige entre estos roles; `admin` se asigna en la base de datos.
SELF_ASSIGNABLE_ROLES = ("lector", "uploader")


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def public_user(user: dict, *, with_date: bool = False) -> dict:
    data = {
        "id": user["_id"],
        "nombre": user["nombre_usuario"],
        "nombre_usuario": user["nombre_usuario"],
        "email": user["correo"],
        "correo": user["correo"],
        "tipo_usuario": user["tipo_usuario"],
        "rol": user["tipo_usuario"],
    }
    if with_date:
        data["fecha_registro"] = user.get("fecha_registro")
    return data


def _session(user: dict) -> str:
    return create_token(str(user["_id"]), user["nombre_usuario"], user["tipo_usuario"])


@router.post("/login")
async def login(request: Request):
    body = await json_body(request)
    identifier = body.get("email") or body.get("correo") or body.get("username") or body.get("nombre_usuario")
    password = body.get("password")
    if not identifier or not password:
        raise LegacyError(400, "Por favor proporciona usuario o correo y contraseña.")

    identifier = str(identifier)
    user = await get_db().users.find_one(
        {"$or": [{"correo": identifier.lower().strip()}, {"nombre_usuario": identifier.strip()}]}
    )
    if not user:
        raise LegacyError(401, "Credenciales inválidas. Usuario no encontrado.")
    if not verify_password(str(password), user.get("password_hash", "")):
        raise LegacyError(401, "Contraseña incorrecta.")

    return ApiResponse(
        {
            "success": True,
            "message": "Inicio de sesión exitoso",
            "token": _session(user),
            "user": public_user(user, with_date=True),
        }
    )


@router.post("/register")
async def register(request: Request):
    body = await json_body(request)
    nombre = _text(body.get("nombre_usuario"))
    correo = _text(body.get("correo")).lower()
    password = body.get("password")
    if not nombre or not correo or not password:
        raise LegacyError(400, "Nombre de usuario, correo y contraseña son obligatorios.")
    if not EMAIL_PATTERN.match(correo):
        raise LegacyError(400, "Por favor ingresa un correo válido")
    tipo = body.get("tipo_usuario") or "lector"
    if tipo not in SELF_ASSIGNABLE_ROLES:
        raise LegacyError(400, "El tipo de usuario debe ser lector o uploader.")

    users = get_db().users
    if await users.find_one({"$or": [{"correo": correo}, {"nombre_usuario": nombre}]}):
        raise LegacyError(400, "El nombre de usuario o correo ya se encuentra registrado.")

    now = utcnow()
    document = {
        "nombre_usuario": nombre,
        "correo": correo,
        "password_hash": hash_password(str(password)),
        "tipo_usuario": tipo,
        "fecha_registro": now,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        document["_id"] = (await users.insert_one(document)).inserted_id
    except DuplicateKeyError:
        raise LegacyError(400, "El nombre de usuario o correo ya se encuentra registrado.") from None

    return ApiResponse(
        {
            "success": True,
            "message": "Usuario registrado exitosamente",
            "token": _session(document),
            "user": public_user(document),
        },
        status_code=201,
    )


@router.get("/me")
async def current_user(request: Request):
    header = request.headers.get("authorization")
    if not header or not header.startswith("Bearer "):
        raise LegacyError(401, "Token no proporcionado.")
    try:
        decoded = decode_token(header.split(" ", 1)[1])
        user = await get_db().users.find_one({"_id": ObjectId(decoded["id"])}, {"password_hash": 0})
    except (jwt.PyJWTError, Exception):  # noqa: BLE001 — cualquier fallo de token o id es "inválido"
        raise LegacyError(401, "Token inválido o expirado.") from None
    if not user:
        raise LegacyError(404, "Usuario no encontrado.")
    return ApiResponse({"success": True, "user": public_user(user)})


@router.post("/logout")
async def logout():
    return ApiResponse({"success": True, "message": "Sesión cerrada exitosamente"})
