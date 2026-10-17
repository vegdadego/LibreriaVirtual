"""Sesión: tokens JWT y contraseñas bcrypt compatibles con el backend anterior."""

from __future__ import annotations

import time
from dataclasses import dataclass

import bcrypt
import jwt
from fastapi import Depends, Request

from .config import get_jwt_secret
from .errors import AppError

TOKEN_TTL_SECONDS = 7 * 24 * 3600


@dataclass(frozen=True)
class CurrentUser:
    id: str
    nombre_usuario: str
    tipo_usuario: str


def create_token(user_id: str, nombre_usuario: str, tipo_usuario: str) -> str:
    """Token HS256 de 7 días con el mismo contenido que emitía el backend en Node."""
    now = int(time.time())
    payload = {
        "id": str(user_id),
        "nombre_usuario": nombre_usuario,
        "tipo_usuario": tipo_usuario,
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm="HS256")


def decode_token(token: str) -> dict:
    """Verifica firma y caducidad. Lanza `jwt.PyJWTError` si no es válido."""
    return jwt.decode(token, get_jwt_secret(), algorithms=["HS256"], options={"verify_aud": False})


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


async def authenticate(request: Request) -> CurrentUser:
    """Dependencia: exige `Authorization: Bearer <token>` válido."""
    header = request.headers.get("authorization")
    if not header or not header.startswith("Bearer "):
        raise AppError(401, "UNAUTHENTICATED", "Token no proporcionado.")
    try:
        decoded = decode_token(header.split(" ", 1)[1])
    except jwt.PyJWTError:
        raise AppError(401, "INVALID_TOKEN", "Token inválido o expirado.") from None
    return CurrentUser(
        id=str(decoded.get("id")),
        nombre_usuario=decoded.get("nombre_usuario"),
        tipo_usuario=decoded.get("tipo_usuario"),
    )


def require_role(*roles: str):
    """Dependencia: deja pasar solo a los roles indicados (después de `authenticate`)."""

    async def check(user: CurrentUser = Depends(authenticate)) -> CurrentUser:
        if user.tipo_usuario not in roles:
            raise AppError(403, "FORBIDDEN", "No tienes permisos para realizar esta acción.")
        return user

    return check


can_write = require_role("uploader", "admin")
admin_only = require_role("admin")
