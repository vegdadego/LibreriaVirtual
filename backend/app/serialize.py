"""Serialización de las respuestas: ObjectId a texto y fechas ISO con milisegundos y `Z`.

El formato de fecha es el que daba el backend anterior (`2018-05-01T00:00:00.000Z`).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import orjson
from bson import ObjectId
from fastapi.responses import JSONResponse


def iso(value: datetime) -> str:
    """Fecha en UTC como `AAAA-MM-DDTHH:MM:SS.mmmZ` (las fechas sin zona se toman como UTC)."""
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.isoformat(timespec="milliseconds") + "Z"


def jsonable(value: Any) -> Any:
    """Copia de `value` con ObjectId y fechas convertidos a texto."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return iso(value)
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    return value


class ApiResponse(JSONResponse):
    """Respuesta JSON con orjson (más rápida que `json`) y la conversión de `jsonable`."""

    def render(self, content: Any) -> bytes:
        return orjson.dumps(jsonable(content))
