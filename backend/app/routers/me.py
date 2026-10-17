"""/api/v1/me — biblioteca personal: guardados, progreso de lectura y carpetas (requieren sesión)."""

from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, Request
from pymongo.errors import DuplicateKeyError

from ..db import FOLDER_COLLATION, get_db
from ..errors import AppError
from ..http import json_body, utcnow
from ..security import CurrentUser, authenticate
from ..serialize import ApiResponse
from ..services.book_queries import count_book_pages, find_catalog_books_by_ids
from ..services.user_library import upsert_user_book
from ..text_utils import to_object_id

router = APIRouter(dependencies=[Depends(authenticate)])

#: Máximo de libros en "continuar leyendo".
CONTINUE_LIMIT = 20
#: Carpetas que puede tener cada usuario.
MAX_FOLDERS = 100
#: Libros que caben en una carpeta.
MAX_BOOKS_PER_FOLDER = 500
#: Portadas que se muestran en el mosaico de una carpeta.
PREVIEW_COUNT = 4
NAME_MAX = 80
DESCRIPTION_MAX = 300


def current_user_id(user: CurrentUser) -> ObjectId:
    return to_object_id(user.id, "usuario")


async def _require_book(book_id: ObjectId) -> None:
    if await count_book_pages(book_id) is None:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")


# --- Guardados y progreso ------------------------------------------------------------------


@router.get("/estado")
async def library_state(user: CurrentUser = Depends(authenticate)):
    """Estado compacto del usuario con los libros: ids de los guardados y progreso de lectura."""
    docs = await get_db().user_books.find(
        {"usuario": current_user_id(user)},
        {"libro": 1, "guardado": 1, "pagina_actual": 1, "ultima_lectura": 1},
    ).to_list(None)
    return ApiResponse(
        {
            "success": True,
            "data": {
                "guardados": [str(d["libro"]) for d in docs if d.get("guardado")],
                "progreso": [
                    {
                        "libro_id": str(d["libro"]),
                        "pagina_actual": d["pagina_actual"],
                        "ultima_lectura": d.get("ultima_lectura"),
                    }
                    for d in docs
                    if d.get("pagina_actual", 0) > 0
                ],
            },
        }
    )


@router.get("/guardados")
async def list_saved(user: CurrentUser = Depends(authenticate)):
    """Libros guardados para ver más tarde, el último guardado primero (metadatos, sin texto)."""
    saved = (
        await get_db()
        .user_books.find({"usuario": current_user_id(user), "guardado": True}, {"libro": 1})
        .sort([("guardado_en", -1), ("_id", -1)])
        .to_list(None)
    )
    data = await find_catalog_books_by_ids([d["libro"] for d in saved])
    return ApiResponse({"success": True, "total": len(data), "data": data})


@router.put("/guardados/{book_id}")
async def save_book(book_id: str, user: CurrentUser = Depends(authenticate)):
    """Guarda un libro para ver más tarde (idempotente)."""
    libro = to_object_id(book_id)
    await _require_book(libro)
    await upsert_user_book(current_user_id(user), libro, {"$set": {"guardado": True, "guardado_en": utcnow()}})
    return ApiResponse({"success": True, "data": {"libro_id": str(libro), "guardado": True}})


@router.delete("/guardados/{book_id}")
async def unsave_book(book_id: str, user: CurrentUser = Depends(authenticate)):
    """Quita el libro de guardados (idempotente). El progreso de lectura se conserva."""
    libro = to_object_id(book_id)
    await get_db().user_books.update_one(
        {"usuario": current_user_id(user), "libro": libro},
        {"$set": {"guardado": False}, "$unset": {"guardado_en": 1}},
    )
    return ApiResponse({"success": True, "data": {"libro_id": str(libro), "guardado": False}})


@router.get("/progreso")
async def list_progress(user: CurrentUser = Depends(authenticate)):
    """Libros que el usuario empezó a leer ("continuar leyendo"), el más reciente primero."""
    docs = (
        await get_db()
        .user_books.find(
            {"usuario": current_user_id(user), "pagina_actual": {"$gt": 0}},
            {"libro": 1, "pagina_actual": 1, "ultima_lectura": 1},
        )
        .sort([("ultima_lectura", -1), ("_id", -1)])
        .limit(CONTINUE_LIMIT)
        .to_list(None)
    )
    books = await find_catalog_books_by_ids([d["libro"] for d in docs])
    by_id = {d["libro"]: d for d in docs}
    data = [
        {**book, "pagina_actual": by_id[book["_id"]]["pagina_actual"], "ultima_lectura": by_id[book["_id"]].get("ultima_lectura")}
        for book in books
    ]
    return ApiResponse({"success": True, "total": len(data), "data": data})


@router.put("/progreso/{book_id}")
async def set_progress(book_id: str, request: Request, user: CurrentUser = Depends(authenticate)):
    """Guarda la página por la que va el usuario. Cuerpo: `{"pagina": 12}` (entre 1 y el total)."""
    libro = to_object_id(book_id)
    body = await json_body(request)
    try:
        raw = body.get("pagina")
        parsed = float(raw) if raw is not None and not isinstance(raw, bool) else float("nan")
        pagina = int(parsed) if parsed == parsed and parsed.is_integer() else 0
    except (TypeError, ValueError, OverflowError):
        pagina = 0
    if pagina < 1:
        raise AppError(400, "INVALID_PAGE", "La página debe ser un entero mayor o igual a 1.")

    total = await count_book_pages(libro)
    if total is None:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    if pagina > total:
        raise AppError(400, "INVALID_PAGE", f"El libro solo tiene {total} páginas.", total_paginas=total)

    doc = await upsert_user_book(current_user_id(user), libro, {"$set": {"pagina_actual": pagina, "ultima_lectura": utcnow()}})
    return ApiResponse(
        {
            "success": True,
            "data": {"libro_id": str(libro), "pagina_actual": doc["pagina_actual"], "ultima_lectura": doc["ultima_lectura"]},
        }
    )


# --- Carpetas ------------------------------------------------------------------------------


def parse_folder_body(body: dict, *, partial: bool = False) -> dict[str, str]:
    """Valida y limpia los campos editables. Con `partial` el nombre no es obligatorio."""
    fields: dict[str, str] = {}
    if body.get("nombre") is not None or not partial:
        nombre = body["nombre"].strip() if isinstance(body.get("nombre"), str) else ""
        if not nombre:
            raise AppError(400, "INVALID_FOLDER", "El nombre de la carpeta es obligatorio.")
        if len(nombre) > NAME_MAX:
            raise AppError(400, "INVALID_FOLDER", f"El nombre no puede superar los {NAME_MAX} caracteres")
        fields["nombre"] = nombre
    if body.get("descripcion") is not None:
        if not isinstance(body["descripcion"], str):
            raise AppError(400, "INVALID_FOLDER", "La descripción debe ser texto.")
        descripcion = body["descripcion"].strip()
        if len(descripcion) > DESCRIPTION_MAX:
            raise AppError(400, "INVALID_FOLDER", f"La descripción no puede superar los {DESCRIPTION_MAX} caracteres")
        fields["descripcion"] = descripcion
    return fields


async def find_own_folder(folder_id: str, user: CurrentUser) -> dict:
    """Carpeta del usuario en sesión; `FOLDER_NOT_FOUND` si no existe o es de otro usuario."""
    folder = await get_db().folders.find_one({"_id": to_object_id(folder_id, "carpeta"), "usuario": current_user_id(user)})
    if not folder:
        raise AppError(404, "FOLDER_NOT_FOUND", "Carpeta no encontrada")
    return folder


def public_folder(folder: dict, previews: list[dict] | None = None) -> dict:
    """Representación pública de una carpeta (sin los libros completos)."""
    return {
        "_id": str(folder["_id"]),
        "nombre": folder["nombre"],
        "descripcion": folder.get("descripcion", ""),
        "total_libros": len(folder["libros"]),
        "libro_ids": [str(i) for i in folder["libros"]],
        "previews": [
            {"_id": str(b["_id"]), "titulo": b["titulo"], "tiene_portada": b["tiene_portada"]} for b in (previews or [])
        ],
        "createdAt": folder.get("createdAt"),
        "updatedAt": folder.get("updatedAt"),
    }


@router.get("/carpetas")
async def list_folders(user: CurrentUser = Depends(authenticate)):
    """Carpetas del usuario, la modificada más reciente primero, con ids y hasta 4 portadas de muestra."""
    folders = (
        await get_db()
        .folders.find({"usuario": current_user_id(user)})
        .sort([("updatedAt", -1), ("_id", -1)])
        .limit(MAX_FOLDERS)
        .to_list(None)
    )
    preview_ids = list(dict.fromkeys(i for f in folders for i in f["libros"][:PREVIEW_COUNT]))
    books = await find_catalog_books_by_ids(preview_ids)
    by_id = {b["_id"]: b for b in books}
    data = [
        public_folder(f, [by_id[i] for i in f["libros"][:PREVIEW_COUNT] if i in by_id]) for f in folders
    ]
    return ApiResponse({"success": True, "total": len(data), "data": data})


@router.post("/carpetas")
async def create_folder(request: Request, user: CurrentUser = Depends(authenticate)):
    """Crea una carpeta. Cuerpo: `{"nombre", "descripcion"?, "libro_id"?}`; `libro_id` la crea con ese libro."""
    body = await json_body(request)
    fields = parse_folder_body(body)
    usuario = current_user_id(user)

    libros: list[ObjectId] = []
    if body.get("libro_id"):
        libro = to_object_id(body["libro_id"])
        await _require_book(libro)
        libros = [libro]

    db = get_db()
    if await db.folders.count_documents({"usuario": usuario}) >= MAX_FOLDERS:
        raise AppError(400, "FOLDER_LIMIT", f"Solo puedes tener hasta {MAX_FOLDERS} carpetas.")

    now = utcnow()
    folder: dict[str, Any] = {
        "usuario": usuario,
        "descripcion": "",
        **fields,
        "libros": libros,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        folder["_id"] = (await db.folders.insert_one(folder)).inserted_id
    except DuplicateKeyError:
        raise AppError(409, "DUPLICATE_FOLDER", "Ya tienes una carpeta con ese nombre.") from None
    previews = await find_catalog_books_by_ids(libros)
    return ApiResponse({"success": True, "data": public_folder(folder, previews)}, status_code=201)


@router.get("/carpetas/{folder_id}")
async def get_folder(folder_id: str, user: CurrentUser = Depends(authenticate)):
    """Una carpeta con sus libros (metadatos, sin texto) en el orden en que se añadieron."""
    folder = await find_own_folder(folder_id, user)
    libros = await find_catalog_books_by_ids(folder["libros"])
    return ApiResponse({"success": True, "data": {**public_folder(folder, libros[:PREVIEW_COUNT]), "libros": libros}})


@router.put("/carpetas/{folder_id}")
async def update_folder(folder_id: str, request: Request, user: CurrentUser = Depends(authenticate)):
    """Cambia el nombre y/o la descripción."""
    fields = parse_folder_body(await json_body(request), partial=True)
    folder = await find_own_folder(folder_id, user)
    fields["updatedAt"] = utcnow()
    try:
        await get_db().folders.update_one({"_id": folder["_id"]}, {"$set": fields})
    except DuplicateKeyError:
        raise AppError(409, "DUPLICATE_FOLDER", "Ya tienes una carpeta con ese nombre.") from None
    folder.update(fields)
    previews = await find_catalog_books_by_ids(folder["libros"][:PREVIEW_COUNT])
    return ApiResponse({"success": True, "data": public_folder(folder, previews)})


@router.delete("/carpetas/{folder_id}")
async def delete_folder(folder_id: str, user: CurrentUser = Depends(authenticate)):
    """Borra la carpeta (los libros no se tocan)."""
    folder = await find_own_folder(folder_id, user)
    await get_db().folders.delete_one({"_id": folder["_id"]})
    return ApiResponse({"success": True, "data": {"_id": str(folder["_id"])}})


async def _folder_book_response(folder_id: ObjectId, libro: ObjectId) -> ApiResponse:
    updated = await get_db().folders.find_one({"_id": folder_id})
    return ApiResponse(
        {
            "success": True,
            "data": {"carpeta_id": str(folder_id), "libro_id": str(libro), "total_libros": len(updated["libros"])},
        }
    )


@router.put("/carpetas/{folder_id}/libros/{book_id}")
async def add_book_to_folder(folder_id: str, book_id: str, user: CurrentUser = Depends(authenticate)):
    """Añade un libro a la carpeta (idempotente: si ya estaba no se duplica)."""
    libro = to_object_id(book_id)
    folder = await find_own_folder(folder_id, user)
    await _require_book(libro)

    if libro not in folder["libros"]:
        if len(folder["libros"]) >= MAX_BOOKS_PER_FOLDER:
            raise AppError(400, "FOLDER_FULL", f"Una carpeta admite hasta {MAX_BOOKS_PER_FOLDER} libros.")
        # $addToSet evita duplicados aunque dos peticiones lleguen a la vez.
        await get_db().folders.update_one({"_id": folder["_id"]}, {"$addToSet": {"libros": libro}})
    return await _folder_book_response(folder["_id"], libro)


@router.delete("/carpetas/{folder_id}/libros/{book_id}")
async def remove_book_from_folder(folder_id: str, book_id: str, user: CurrentUser = Depends(authenticate)):
    """Quita un libro de la carpeta (idempotente)."""
    libro = to_object_id(book_id)
    folder = await find_own_folder(folder_id, user)
    await get_db().folders.update_one({"_id": folder["_id"]}, {"$pull": {"libros": libro}})
    return await _folder_book_response(folder["_id"], libro)
