"""CRUD genérico de las colecciones sencillas (autores, sagas, usuarios).

Respuestas en el formato heredado `{success, message, data}`. Cada colección declara sus
campos con `Field`; `build_document` valida y limpia el cuerpo como hacían los esquemas de
Mongoose (texto recortado, valores por defecto, listas de valores permitidos).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Sequence

from bson import ObjectId
from fastapi import APIRouter, Depends, Request
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..errors import LegacyError
from ..http import json_body, legacy_object_id, utcnow
from ..serialize import ApiResponse


@dataclass(frozen=True)
class Field:
    name: str
    kind: str = "str"  # str | number | enum
    required: bool = False
    default: Any = None
    choices: Sequence[str] = ()
    minimum: float | None = None
    lower: bool = False
    #: Mensaje cuando falta (o es inválido) el campo.
    message: str | None = None
    check: Callable[[Any], bool] | None = None


def build_document(fields: Sequence[Field], body: dict, *, partial: bool = False) -> dict:
    """Valida `body` según `fields`. Con `partial` (edición) solo mira los campos presentes."""
    document: dict[str, Any] = {}
    for spec in fields:
        present = spec.name in body and body[spec.name] is not None
        if not present:
            if partial:
                continue
            if spec.required:
                raise LegacyError(400, spec.message or f"{spec.name} es obligatorio")
            if spec.default is not None:
                document[spec.name] = spec.default() if callable(spec.default) else spec.default
            continue

        value = body[spec.name]
        if spec.kind == "number":
            try:
                value = float(value)
            except (TypeError, ValueError):
                raise LegacyError(400, f"{spec.name} debe ser un número") from None
            if spec.minimum is not None and value < spec.minimum:
                raise LegacyError(400, f"{spec.name} no puede ser menor que {spec.minimum:g}")
            value = int(value) if value == int(value) else value
        else:
            if not isinstance(value, str):
                raise LegacyError(400, f"{spec.name} debe ser texto")
            value = value.strip()
            if spec.lower:
                value = value.lower()
            if spec.required and not value:
                raise LegacyError(400, spec.message or f"{spec.name} es obligatorio")
            if spec.kind == "enum" and value not in spec.choices:
                raise LegacyError(400, f"{value} no es un valor válido para {spec.name}")
        if spec.check and not spec.check(value):
            raise LegacyError(400, spec.message or f"{spec.name} no es válido")
        document[spec.name] = value
    return document


def make_crud_router(
    *,
    collection: str,
    fields: Sequence[Field],
    labels: dict[str, str],
    sort: tuple[str, int],
    hidden: Sequence[str] = (),
    write_dependencies: Sequence[Any] = (),
    read_dependencies: Sequence[Any] = (),
    prepare: Callable[[dict, dict, bool], dict] | None = None,
    duplicate_message: str = "Ya existe un registro con esos datos",
) -> APIRouter:
    """Crea el router con listar, obtener, crear, editar y borrar.

    `labels`: textos de `not_found`, `created`, `updated`, `deleted`.
    `hidden`: campos que no salen en las respuestas (por ejemplo `password_hash`).
    `prepare(document, body, partial)`: ajuste final del documento antes de guardarlo.
    """
    router = APIRouter()
    projection = {name: 0 for name in hidden} or None

    def col():
        return get_db()[collection]

    def public(document: dict) -> dict:
        return {k: v for k, v in document.items() if k not in hidden}

    @router.get("", dependencies=list(read_dependencies))
    async def list_all():
        direction = ASCENDING if sort[1] == 1 else DESCENDING
        data = await col().find({}, projection).sort(sort[0], direction).to_list(None)
        return ApiResponse({"success": True, "total": len(data), "data": data})

    @router.get("/{item_id}", dependencies=list(read_dependencies))
    async def get_one(item_id: str):
        document = await col().find_one({"_id": legacy_object_id(item_id)}, projection)
        if not document:
            raise LegacyError(404, labels["not_found"])
        return ApiResponse({"success": True, "data": document})

    @router.post("", dependencies=list(write_dependencies))
    async def create(request: Request):
        body = await json_body(request)
        document = build_document(fields, body)
        if prepare:
            document = prepare(document, body, False)
        now = utcnow()
        document.update(createdAt=now, updatedAt=now)
        try:
            document["_id"] = (await col().insert_one(document)).inserted_id
        except DuplicateKeyError:
            raise LegacyError(400, duplicate_message) from None
        return ApiResponse(
            {"success": True, "message": labels["created"], "data": public(document)}, status_code=201
        )

    @router.put("/{item_id}", dependencies=list(write_dependencies))
    async def update(item_id: str, request: Request):
        object_id = legacy_object_id(item_id)
        body = await json_body(request)
        changes = build_document(fields, body, partial=True)
        if prepare:
            changes = prepare(changes, body, True)
        changes["updatedAt"] = utcnow()
        try:
            document = await col().find_one_and_update(
                {"_id": object_id}, {"$set": changes}, projection=projection, return_document=True
            )
        except DuplicateKeyError:
            raise LegacyError(400, duplicate_message) from None
        if not document:
            raise LegacyError(404, labels["not_found"])
        return ApiResponse({"success": True, "message": labels["updated"], "data": document})

    @router.delete("/{item_id}", dependencies=list(write_dependencies))
    async def delete(item_id: str):
        document = await col().find_one_and_delete({"_id": legacy_object_id(item_id)})
        if not document:
            raise LegacyError(404, labels["not_found"])
        return ApiResponse({"success": True, "message": labels["deleted"], "data": public(document)})

    return router
