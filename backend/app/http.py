"""Ayudas para leer la petición."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import orjson
from bson import ObjectId
from fastapi import Request

from .errors import AppError, LegacyError
from .text_utils import to_object_id


def utcnow() -> datetime:
    """Ahora en UTC sin zona, como guarda las fechas MongoDB (milisegundos)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


async def json_body(request: Request) -> dict[str, Any]:
    """Cuerpo JSON de la petición como diccionario (vacío si no hay o no es JSON).

    Lanza `INVALID_JSON` (400) si el cuerpo no se puede interpretar.
    """
    if not request.headers.get("content-type", "").lower().startswith("application/json"):
        return {}
    raw = await request.body()
    if not raw.strip():
        return {}
    try:
        data = orjson.loads(raw)
    except orjson.JSONDecodeError:
        raise AppError(400, "INVALID_JSON", "JSON inválido.") from None
    return data if isinstance(data, dict) else {}


def legacy_object_id(value: str) -> ObjectId:
    """ObjectId para las rutas heredadas (error en su formato `{success, message}`)."""
    try:
        return to_object_id(value, "recurso")
    except AppError:
        raise LegacyError(400, "Identificador inválido.") from None
