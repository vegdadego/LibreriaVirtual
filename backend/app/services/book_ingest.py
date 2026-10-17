"""Validación de los metadatos de un libro y guardado del libro con sus páginas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from ..db import LOOSE_COLLATION, get_db
from ..errors import AppError
from ..http import utcnow
from ..text_utils import fold_text, parse_list
from .cover_storage import delete_cover, save_cover


def _is_blank(value: Any) -> bool:
    return value is None or str(value).strip() == ""


def _to_positive_int(value: Any, field: str) -> int:
    """Entero >= 1 o error de validación (`"3"` y `3.0` valen 3, como en JavaScript)."""
    try:
        number = float(value) if not isinstance(value, bool) else float("nan")
    except (TypeError, ValueError):
        number = float("nan")
    if number != number or not number.is_integer() or number < 1:
        raise AppError(400, "INVALID_METADATA", f'"{field}" debe ser un entero mayor o igual a 1.')
    return int(number)


def _parse_date(value: Any) -> datetime:
    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        raise AppError(400, "INVALID_METADATA", '"fecha_publicacion" no es una fecha válida.') from None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _parse_authors(value: Any) -> list[str]:
    if isinstance(value, list) and any(isinstance(item, dict) for item in value):
        return parse_list([item.get("nombre") if isinstance(item, dict) else item for item in value])
    return parse_list(value)


def parse_book_metadata(body: dict | None = None, *, partial: bool = False) -> dict:
    """Valida y normaliza los metadatos recibidos del formulario o de un JSON.

    Solo se aceptan los campos conocidos (lista blanca), nunca el contenido de las páginas.
    Con `partial` (edición) solo se incluyen los campos presentes y el título no es obligatorio.
    `autores` y `saga` quedan sin resolver (ver `resolve_relations`).

    Lanza `INVALID_METADATA` si falta el título o algún valor no es válido.
    """
    body = body or {}
    has = lambda key: key in body and body[key] is not None  # noqa: E731
    meta: dict[str, Any] = {}

    if has("titulo") or not partial:
        if _is_blank(body.get("titulo")):
            raise AppError(400, "INVALID_METADATA", "El título del libro es obligatorio.")
        meta["titulo"] = str(body["titulo"]).strip()
    if has("sinopsis"):
        meta["sinopsis"] = str(body["sinopsis"]).strip()
    if has("idioma") and not _is_blank(body["idioma"]):
        meta["idioma"] = str(body["idioma"]).strip()
    if has("empresa_edicion"):
        meta["empresa_edicion"] = str(body["empresa_edicion"]).strip()
    if has("numero_edicion") and not _is_blank(body["numero_edicion"]):
        meta["numero_edicion"] = _to_positive_int(body["numero_edicion"], "numero_edicion")
    if has("fecha_publicacion") and not _is_blank(body["fecha_publicacion"]):
        meta["fecha_publicacion"] = _parse_date(body["fecha_publicacion"])
    if has("categorias"):
        meta["categorias"] = parse_list(body["categorias"])
    if has("autores"):
        meta["autores"] = [{"nombre": nombre} for nombre in _parse_authors(body["autores"])]

    if has("saga"):
        raw = body["saga"] if isinstance(body["saga"], dict) else None
        name = raw.get("nombre_saga") if raw else body["saga"]
        number = raw.get("numero_en_saga") if raw else body.get("numero_en_saga")
        meta["saga"] = (
            None
            if _is_blank(name)
            else {
                "nombre_saga": str(name).strip(),
                "numero_en_saga": 1 if _is_blank(number) else _to_positive_int(number, "numero_en_saga"),
            }
        )
    return meta


def title_key_for(meta: dict) -> str:
    """Clave para detectar el mismo libro: título, edición e idioma sin distinguir mayúsculas ni acentos."""
    parts = [meta["titulo"], meta.get("numero_edicion", 1), meta.get("idioma", "es")]
    return "|".join(fold_text(part) for part in parts)


async def resolve_relations(meta: dict) -> dict:
    """Completa `autores` y `saga` con el id de los documentos ya existentes en `authors`/`sagas`
    (búsqueda por nombre). Si no existen queda solo el nombre: no se crean autores ni sagas."""
    db = get_db()
    resolved = dict(meta)

    if meta.get("autores"):
        names = [author["nombre"] for author in meta["autores"]]
        found = await db.authors.find(
            {"nombre": {"$in": names}}, {"nombre": 1}, collation=LOOSE_COLLATION
        ).to_list(None)
        by_name = {fold_text(author["nombre"]): author for author in found}
        resolved["autores"] = [
            {"id_autor": by_name[fold_text(a["nombre"])]["_id"], "nombre": by_name[fold_text(a["nombre"])]["nombre"]}
            if fold_text(a["nombre"]) in by_name
            else {"nombre": a["nombre"]}
            for a in meta["autores"]
        ]

    if meta.get("saga"):
        saga = await db.sagas.find_one(
            {"nombre": meta["saga"]["nombre_saga"]}, {"nombre": 1}, collation=LOOSE_COLLATION
        )
        if saga:
            resolved["saga"] = {**meta["saga"], "id_saga": saga["_id"], "nombre_saga": saga["nombre"]}
    return resolved


async def find_duplicate_book(meta: dict) -> dict | None:
    """Busca un libro ya registrado con el mismo título, edición e idioma."""
    return await get_db().books.find_one(
        {
            "titulo": meta["titulo"],
            "numero_edicion": meta.get("numero_edicion", 1),
            "idioma": meta.get("idioma", "es"),
        },
        {"_id": 1},
        collation=LOOSE_COLLATION,
    )


def _duplicate_error(existing: dict) -> AppError:
    return AppError(
        409,
        "DUPLICATE_BOOK",
        "Ya existe un libro con ese título, edición e idioma.",
        libro_id=str(existing["_id"]),
    )


def new_book_document(meta: dict, pages: list[dict] | None = None) -> dict:
    """Documento de libro con los valores por defecto del esquema."""
    now = utcnow()
    return {
        "fecha_publicacion": None,
        "empresa_edicion": None,
        "numero_edicion": 1,
        "sinopsis": "",
        "idioma": "es",
        "categorias": [],
        "autores": [],
        "saga": None,
        "contenido_escaneado": pages or [],
        **meta,
        "createdAt": now,
        "updatedAt": now,
    }


async def save_book_with_pages(meta: dict, pages: list[dict], cover: dict | None = None) -> dict:
    """Registra un libro con todas sus páginas en una sola inserción (un único documento, así
    la operación es atómica). La portada se escribe en disco antes de guardar y se borra si el
    guardado falla. Lanza `DUPLICATE_BOOK` (409) si el libro ya está registrado."""
    duplicate = await find_duplicate_book(meta)
    if duplicate:
        raise _duplicate_error(duplicate)

    document = new_book_document(await resolve_relations(meta), pages)
    document = {k: v for k, v in document.items() if not (v is None and k in ("fecha_publicacion", "empresa_edicion"))}
    document["_id"] = ObjectId()
    if cover:
        document["portada"] = await save_cover(document["_id"], cover["data"], cover["mime"])
    try:
        await get_db().books.insert_one(document)
    except Exception:
        if cover:
            await delete_cover(document["portada"]["archivo"])
        raise
    return document
