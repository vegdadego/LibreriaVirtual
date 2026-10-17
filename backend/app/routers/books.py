"""/api/v1/books — catálogo, lectura, portadas, subida y análisis de PDF."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import os
import re
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, Response
from starlette.datastructures import UploadFile

from ..config import get_limits
from ..db import LOOSE_COLLATION, get_db
from ..errors import AppError
from ..http import json_body, utcnow
from ..security import CurrentUser, authenticate, can_write
from ..serialize import ApiResponse
from ..services import pdf_worker
from ..services.book_ingest import (
    duplicate_error,
    ensure_can_manage,
    find_duplicate_book,
    new_book_document,
    parse_book_metadata,
    resolve_relations,
    save_book_with_pages,
    title_key_for,
)
from ..services.book_queries import (
    DERIVED_FIELDS,
    HEAVY_FIELDS,
    PAGE_COUNT,
    ensure_content_start,
    find_catalog_books_by_ids,
)
from ..services.cover_image import detect_image_mime
from ..services.cover_storage import cover_file_path, delete_cover
from ..services.pdf_text import extract_pdf_pages, looks_like_pdf, raise_if_error, run_in_pool
from ..services.staged_uploads import (
    discard_stage,
    finish_stage,
    get_stage,
    prepare_stage,
    stage_error,
    to_public_stage,
    wait_pages,
)
from ..services.upload_jobs import enqueue_upload, get_job, to_public_job
from ..services.user_library import remove_book_references
from ..text_utils import escape_regex, fold_text, to_object_id

router = APIRouter()

DEFAULT_LIMIT = 20
MAX_LIMIT = 100
#: Tipos MIME aceptados; algunos clientes envían los PDF como octet-stream.
ACCEPTED_MIME_TYPES = {"application/pdf", "application/x-pdf", "application/octet-stream"}
#: Margen de la petición multipart sobre el tamaño de los archivos (cabeceras, campos de texto).
MULTIPART_OVERHEAD = 1024 * 1024


def query_text(value: Any) -> str:
    return str(value if value is not None else "").strip()


def to_bounded_int(value: Any, fallback: int, maximum: int) -> int:
    """Entero >= 1 dentro de un rango (`parseInt` indulgente: "12abc" vale 12)."""
    match = re.match(r"\s*[+-]?\d+", query_text(value))
    number = int(match.group()) if match else 0
    return min(number, maximum) if number >= 1 else fallback


def build_catalog_filter(query: dict[str, str]) -> dict:
    """Filtro de MongoDB para el catálogo; todo texto del usuario se escapa antes de usarse en regex."""
    filtro: dict[str, Any] = {}
    categoria = query_text(query.get("categoria"))
    saga = query_text(query.get("saga"))
    autor = query_text(query.get("autor"))
    busqueda = query_text(query.get("busqueda"))

    if categoria:
        filtro["categorias"] = categoria
    if saga:
        filtro["saga.nombre_saga"] = {"$regex": escape_regex(saga), "$options": "i"}
    if autor:
        filtro["autores.nombre"] = {"$regex": escape_regex(autor), "$options": "i"}
    if busqueda:
        pattern = {"$regex": escape_regex(busqueda), "$options": "i"}
        filtro["$or"] = [
            {"titulo": pattern},
            {"sinopsis": pattern},
            {"autores.nombre": pattern},
            {"empresa_edicion": pattern},
        ]
    return filtro


# --- Subida --------------------------------------------------------------------------------


async def read_upload_form(request: Request) -> tuple[UploadFile | None, UploadFile | None, dict[str, Any]]:
    """Lee un formulario multipart con el campo `pdf`, una `portada` opcional y campos de texto.

    Responde `FILE_TOO_LARGE` (413) si el PDF no cabe e `INVALID_UPLOAD` (400) si llegan archivos
    en otros campos o más de uno por campo.
    """
    limits = get_limits()
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limits.max_pdf_bytes + limits.max_cover_bytes + MULTIPART_OVERHEAD:
        raise AppError(413, "FILE_TOO_LARGE", "El PDF supera el tamaño máximo permitido.")
    if not request.headers.get("content-type", "").lower().startswith("multipart/form-data"):
        raise AppError(400, "FILE_REQUIRED", 'Adjunta un archivo PDF en el campo "pdf".')

    form = await request.form()
    files: dict[str, UploadFile] = {}
    fields: dict[str, Any] = {}
    for name, value in form.multi_items():
        if isinstance(value, UploadFile):
            if name not in ("pdf", "portada") or name in files:
                raise AppError(
                    400, "INVALID_UPLOAD", 'Envía un PDF en el campo "pdf" y, opcionalmente, una imagen en "portada".'
                )
            files[name] = value
        elif name in fields:  # campo de texto repetido (por ejemplo varias `categorias`)
            current = fields[name]
            fields[name] = [*current, value] if isinstance(current, list) else [current, value]
        else:
            fields[name] = value
    return files.get("pdf"), files.get("portada"), fields


async def read_pdf(upload: UploadFile | None) -> bytes:
    """Bytes del PDF recibido, comprobando que lo sea de verdad (tipo declarado y cabecera `%PDF-`)."""
    if upload is None:
        raise AppError(400, "FILE_REQUIRED", 'Adjunta un archivo PDF en el campo "pdf".')
    data = await upload.read()
    if len(data) > get_limits().max_pdf_bytes:
        raise AppError(413, "FILE_TOO_LARGE", "El PDF supera el tamaño máximo permitido.")
    if (upload.content_type or "") not in ACCEPTED_MIME_TYPES or not looks_like_pdf(data):
        raise AppError(415, "INVALID_FILE", "El archivo no es un PDF válido.")
    return data


async def read_cover(upload: UploadFile | None) -> dict | None:
    """Imagen de portada validada (tamaño y formato reales), o `None` si no se envió."""
    if upload is None:
        return None
    data = await upload.read()
    limit = get_limits().max_cover_bytes
    if len(data) > limit:
        raise AppError(413, "COVER_TOO_LARGE", f"La portada supera el máximo de {limit // 1024} KB.")
    mime = detect_image_mime(data)
    if not mime:
        raise AppError(415, "INVALID_COVER", "La portada debe ser una imagen JPEG, PNG o WebP.")
    return {"data": data, "mime": mime}


@router.post("/analyze")
async def analyze_book(request: Request, _user: CurrentUser = Depends(can_write)):
    """Lee un PDF y propone los datos del libro para rellenar el formulario de subida. No guarda nada."""
    pdf, _cover, _fields = await read_upload_form(request)
    data = await read_pdf(pdf)
    result = raise_if_error(await run_in_pool(pdf_worker.analyze, data))
    return ApiResponse({"success": True, "data": result["data"]})


@router.post("/stage")
async def stage_book(request: Request, user: CurrentUser = Depends(can_write)):
    """Prepara un PDF: lo recibe una sola vez, propone los datos del libro, dibuja su portada y
    empieza a leer su texto en segundo plano. Responde 201 con el `stageId`, el análisis y la
    portada (JPEG en base64); `GET /books/stage/:id` informa el avance de la lectura y
    `POST /books/upload` con ese `stage_id` guarda el libro sin volver a enviar el PDF."""
    pdf, _cover, _fields = await read_upload_form(request)
    data = await read_pdf(pdf)
    stage = await prepare_stage(user.id, data)
    data = None  # el PDF solo queda en la lectura en curso
    portada = stage["portada"]
    same_pdf = await get_db().books.find_one({"hash_pdf": stage["hash"]}, {"_id": 1, "titulo": 1})
    return ApiResponse(
        {
            "success": True,
            "data": {
                **to_public_stage(stage),
                "duplicado": {"libro_id": str(same_pdf["_id"]), "titulo": same_pdf.get("titulo")} if same_pdf else None,
                "analisis": stage["analisis"],
                "portada": {"mime": portada["mime"], "base64": base64.b64encode(portada["data"]).decode("ascii")}
                if portada
                else None,
            },
        },
        status_code=201,
    )


@router.get("/stage/{stage_id}")
async def stage_status(stage_id: str, user: CurrentUser = Depends(can_write)):
    """Avance de la lectura de un PDF preparado (`leyendo`, `listo` o `error`). Solo su dueño."""
    return ApiResponse({"success": True, "data": to_public_stage(get_stage(stage_id, user.id))})


@router.delete("/stage/{stage_id}")
async def discard_staged_book(stage_id: str, user: CurrentUser = Depends(can_write)):
    """Descarta un PDF preparado (se eligió otro archivo o se canceló). No falla si ya no existe."""
    discard_stage(stage_id, user.id)
    return ApiResponse({"success": True})


@router.get("/duplicado")
async def check_duplicate(request: Request, user: CurrentUser = Depends(can_write)):
    """Dice si el libro del formulario ya está en la biblioteca, sin guardar nada. Recibe `titulo`,
    `autores`, `numero_edicion` e `idioma` (como en `POST /books/upload`) y, opcionalmente, el `stage_id`
    del PDF preparado (para comparar también el archivo). Responde `duplicado`: `null` o
    `{libro_id, titulo}`."""
    query = dict(request.query_params)
    meta = parse_book_metadata(query)
    stage_id = query_text(query.get("stage_id"))
    digest = get_stage(stage_id, user.id)["hash"] if stage_id else None
    existing = await find_duplicate_book(meta, content_hash=digest)
    return ApiResponse(
        {
            "success": True,
            "data": {"duplicado": {"libro_id": str(existing["_id"]), "titulo": existing.get("titulo")} if existing else None},
        }
    )


@router.post("/upload")
async def upload_book(request: Request, user: CurrentUser = Depends(can_write)):
    """Guarda un libro. Recibe el PDF (campo `pdf`) o el `stage_id` de un PDF ya preparado con
    `POST /books/stage` (nunca ambos), una portada opcional (`portada`) y los metadatos. Responde
    202 con el `jobId`; un reintento con el mismo archivo devuelve el mismo `jobId` (200)."""
    pdf, cover_upload, fields = await read_upload_form(request)
    stage_id = query_text(fields.get("stage_id"))
    if stage_id and pdf is not None:
        raise AppError(400, "INVALID_UPLOAD", 'Envía el PDF en "pdf" o un "stage_id", no los dos.')
    stage = get_stage(stage_id, user.id, refresh=True) if stage_id else None
    data = None if stage else await read_pdf(pdf)
    portada = await read_cover(cover_upload)
    if portada is None and stage and stage["portada"] and query_text(fields.get("usar_portada_pdf")) in ("1", "true"):
        portada = stage["portada"]

    meta = parse_book_metadata(fields)
    failure = stage_error(stage) if stage else None
    if failure:
        raise failure
    digest = stage["hash"] if stage else await asyncio.to_thread(lambda: hashlib.sha256(data).hexdigest())
    duplicate = await find_duplicate_book(meta, content_hash=digest)
    if duplicate:
        raise duplicate_error(duplicate)

    owner_id = to_object_id(user.id, "usuario")
    if stage:
        payload = {}

        async def task(_job_payload: dict, on_progress):
            # El texto ya se estaba leyendo desde que se preparó el PDF: aquí solo se espera lo que falte.
            pages = await wait_pages(stage, on_progress)
            book = await save_book_with_pages(meta, pages, portada, owner_id, digest)
            finish_stage(stage)
            return {"libro_id": str(book["_id"])}

    else:
        # El PDF pasa al trabajo, que lo suelta al terminar; la petición no lo retiene.
        payload = {"data": data}
        data = None

        async def task(job_payload: dict, on_progress):
            pages = await extract_pdf_pages(job_payload["data"], on_progress=on_progress)
            book = await save_book_with_pages(meta, pages, portada, owner_id, digest)
            return {"libro_id": str(book["_id"])}

    job, reused = enqueue_upload(owner=user.id, hash=digest, title_key=title_key_for(meta), payload=payload, task=task)
    return ApiResponse(
        {"success": True, "data": to_public_job(job)},
        status_code=200 if reused else 202,
        headers={"Location": f"/api/v1/books/uploads/{job['id']}"},
    )


@router.get("/uploads/{job_id}")
async def upload_status(job_id: str, user: CurrentUser = Depends(can_write)):
    """Estado de una carga. Solo la consulta quien la inició o un admin."""
    job = get_job(job_id)
    if not job or not (job["owner"] == user.id or user.tipo_usuario == "admin"):
        raise AppError(404, "JOB_NOT_FOUND", "La carga no existe o ya expiró.")
    return ApiResponse({"success": True, "data": to_public_job(job)})


# --- Catálogo y lectura --------------------------------------------------------------------


@router.get("/categorias")
async def list_categories():
    """Categorías en uso, ordenadas, para los filtros."""
    categories = await get_db().books.distinct("categorias")
    categories.sort(key=fold_text)
    return ApiResponse({"success": True, "total": len(categories), "data": categories})


async def catalog_page(query: dict[str, str], extra_filter: dict | None = None) -> ApiResponse:
    """Una página del catálogo (sin el texto de las páginas) con los filtros de `query`,
    más `extra_filter` (por ejemplo, solo los libros de un usuario)."""
    filtro = {**build_catalog_filter(query), **(extra_filter or {})}
    page = to_bounded_int(query.get("page"), 1, 2**53 - 1)
    limit = to_bounded_int(query.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)

    books = get_db().books
    total = await books.count_documents(filtro, collation=LOOSE_COLLATION)
    cursor = await books.aggregate(
        [
            {"$match": filtro},
            {"$sort": {"createdAt": -1, "_id": -1}},
            {"$skip": (page - 1) * limit},
            {"$limit": limit},
            {"$addFields": DERIVED_FIELDS},
            {"$project": HEAVY_FIELDS},
        ],
        collation=LOOSE_COLLATION,
    )
    data = await cursor.to_list(None)
    return ApiResponse({"success": True, "total": total, "page": page, "limit": limit, "data": data})


@router.get("")
async def list_books(request: Request):
    """Catálogo paginado, sin el texto de las páginas. Query: `categoria`, `saga`, `autor`,
    `busqueda`, `page` (1) y `limit` (20, máx. 100)."""
    return await catalog_page(dict(request.query_params))


@router.get("/mios")
async def list_my_books(request: Request, user: CurrentUser = Depends(can_write)):
    """Los libros que gestiona quien consulta: los que subió él (un `admin` ve todos).
    Mismos filtros y paginación que el catálogo."""
    owner = None if user.tipo_usuario == "admin" else {"subido_por": to_object_id(user.id, "usuario")}
    return await catalog_page(dict(request.query_params), owner)


@router.post("")
async def create_book(request: Request, user: CurrentUser = Depends(can_write)):
    """Registra un libro solo con metadatos (sin páginas). Para subir un PDF: `POST /books/upload`."""
    meta = await resolve_relations(parse_book_metadata(await json_body(request)))
    document = new_book_document(meta)
    document["subido_por"] = to_object_id(user.id, "usuario")
    document = {k: v for k, v in document.items() if not (v is None and k in ("fecha_publicacion", "empresa_edicion"))}
    document["_id"] = (await get_db().books.insert_one(document)).inserted_id
    data = {k: v for k, v in document.items() if k not in ("contenido_escaneado", "portada", "subido_por")}
    return ApiResponse(
        {
            "success": True,
            "message": "Libro registrado exitosamente",
            "data": {**data, "total_paginas": 0, "tiene_portada": False},
        },
        status_code=201,
    )


@router.get("/{book_id}/portada")
async def get_cover(book_id: str):
    """Imagen de portada (JPEG, PNG o WebP) leída de `uploads/portadas`, con caché de un día."""
    book = await get_db().books.find_one({"_id": to_object_id(book_id)}, {"portada": 1})
    if not book:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")

    portada = book.get("portada") or {}
    headers = {"Cache-Control": "public, max-age=86400"}
    path = cover_file_path(portada.get("archivo"))
    if path is not None and os.path.isfile(path):
        return FileResponse(path, media_type=portada.get("mime"), headers=headers)
    # Libros anteriores: la imagen aún está dentro del documento (ver `scripts/migrate_covers.py`).
    if portada.get("data") and path is None:
        return Response(bytes(portada["data"]), media_type=portada.get("mime"), headers=headers)
    raise AppError(404, "COVER_NOT_FOUND", "El libro no tiene portada.")


@router.get("/{book_id}/texto")
async def get_text(book_id: str, _user: CurrentUser = Depends(authenticate)):
    """Todas las páginas del libro en una respuesta (requiere sesión), para la descarga sin conexión."""
    book = await get_db().books.find_one({"_id": to_object_id(book_id)}, {"titulo": 1, "contenido_escaneado": 1})
    if not book:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    pages = sorted(book.get("contenido_escaneado") or [], key=lambda p: p["pagina"])
    paginas = [{"pagina": p["pagina"], "texto": p.get("texto", "")} for p in pages]
    return ApiResponse(
        {
            "success": True,
            "data": {"libro_id": str(book["_id"]), "titulo": book["titulo"], "total_paginas": len(paginas), "paginas": paginas},
        }
    )


@router.get("/{book_id}/paginas/{numero}")
async def get_page(book_id: str, numero: str):
    """Texto de una sola página, con los números de la anterior y la siguiente (`null` en los extremos)."""
    object_id = to_object_id(book_id)
    try:
        parsed = float(numero)
        number = int(parsed) if parsed == parsed and parsed.is_integer() else 0
    except (ValueError, OverflowError):
        number = 0
    if number < 1:
        raise AppError(400, "INVALID_PAGE", "El número de página debe ser un entero mayor o igual a 1.")

    # Solo viaja la página pedida; el resto del texto se queda en la base de datos.
    cursor = await get_db().books.aggregate(
        [
            {"$match": {"_id": object_id}},
            {
                "$project": {
                    "titulo": 1,
                    "inicio_contenido": 1,
                    "total_paginas": PAGE_COUNT,
                    "contenido": {
                        "$arrayElemAt": [
                            {
                                "$filter": {
                                    "input": {"$ifNull": ["$contenido_escaneado", []]},
                                    "as": "p",
                                    "cond": {"$eq": ["$$p.pagina", number]},
                                }
                            },
                            0,
                        ]
                    },
                }
            },
        ]
    )
    result = next(iter(await cursor.to_list(1)), None)
    if not result:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    if not result.get("contenido"):
        raise AppError(404, "PAGE_NOT_FOUND", f"El libro no tiene la página {number}.", total_paginas=result["total_paginas"])

    total = result["total_paginas"]
    inicio = result.get("inicio_contenido")
    if inicio is None:  # libro anterior al campo: se calcula una vez y queda guardado
        inicio = await ensure_content_start(object_id)
    return ApiResponse(
        {
            "success": True,
            "data": {
                "libro_id": str(result["_id"]),
                "titulo": result["titulo"],
                "pagina": number,
                "texto": result["contenido"].get("texto", ""),
                "total_paginas": total,
                "inicio_contenido": inicio or None,
                "anterior": number - 1 if number > 1 else None,
                "siguiente": number + 1 if number < total else None,
            },
        }
    )


@router.get("/{book_id}")
async def get_book(book_id: str):
    """Metadatos del libro y `total_paginas`, sin el texto (se pide página a página)."""
    cursor = await get_db().books.aggregate(
        [
            {"$match": {"_id": to_object_id(book_id)}},
            {"$addFields": DERIVED_FIELDS},
            {"$project": HEAVY_FIELDS},
        ]
    )
    book = next(iter(await cursor.to_list(1)), None)
    if not book:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    if book.get("inicio_contenido") is None:  # libro anterior al campo: se calcula una vez y queda guardado
        book["inicio_contenido"] = await ensure_content_start(book["_id"])
    book["inicio_contenido"] = book["inicio_contenido"] or None
    return ApiResponse({"success": True, "data": book})


def owner_filter(user: CurrentUser) -> dict:
    """Condición extra para operar solo sobre libros propios; un `admin` opera sobre cualquiera."""
    return {} if user.tipo_usuario == "admin" else {"subido_por": to_object_id(user.id, "usuario")}


async def load_managed_book(object_id: ObjectId, user: CurrentUser, projection: dict) -> dict:
    """Libro que `user` puede modificar. `BOOK_NOT_FOUND` (404) si no existe; `NOT_BOOK_OWNER`
    (403) si existe pero es de otra persona."""
    book = await get_db().books.find_one({"_id": object_id}, projection)
    if not book:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    ensure_can_manage(user, book)
    return book


@router.put("/{book_id}")
async def update_book(book_id: str, request: Request, user: CurrentUser = Depends(can_write)):
    """Edita los metadatos (solo quien subió el libro o un admin). El texto de las páginas solo
    cambia al subir un PDF. Responde 409 si el título, edición e idioma ya los tiene otro libro."""
    object_id = to_object_id(book_id)
    current = await load_managed_book(
        object_id, user, {"subido_por": 1, "titulo": 1, "numero_edicion": 1, "idioma": 1}
    )
    meta = parse_book_metadata(await json_body(request), partial=True)
    if {"titulo", "numero_edicion", "idioma"} & meta.keys():
        identity = {
            "titulo": meta.get("titulo", current["titulo"]),
            "numero_edicion": meta.get("numero_edicion", current.get("numero_edicion", 1)),
            "idioma": meta.get("idioma", current.get("idioma", "es")),
        }
        duplicate = await find_duplicate_book(identity, exclude_id=object_id)
        if duplicate:
            raise duplicate_error(duplicate)
    meta = await resolve_relations(meta)
    meta["updatedAt"] = utcnow()
    result = await get_db().books.update_one({"_id": object_id, **owner_filter(user)}, {"$set": meta})
    if not result.matched_count:
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    # Se devuelve con `total_paginas` y `tiene_portada`, como el detalle, para que el cliente no los pierda.
    updated = (await find_catalog_books_by_ids([object_id]))[0]
    return ApiResponse({"success": True, "message": "Libro actualizado exitosamente", "data": updated})


@router.delete("/{book_id}")
async def delete_book(book_id: str, user: CurrentUser = Depends(can_write)):
    """Elimina el libro con todas sus páginas, su portada y lo que apunta a él (solo quien lo
    subió o un admin)."""
    object_id = to_object_id(book_id)
    # El filtro de dueño va en el propio borrado, así permiso y borrado son una sola operación.
    deleted = await get_db().books.find_one_and_delete(
        {"_id": object_id, **owner_filter(user)}, projection={"titulo": 1, "portada.archivo": 1}
    )
    if not deleted:
        # No se borró nada: distingue "no existe" (404) de "es de otra persona" (403).
        await load_managed_book(object_id, user, {"subido_por": 1})
        raise AppError(404, "BOOK_NOT_FOUND", "Libro no encontrado")
    await remove_book_references(deleted["_id"])
    # El libro ya no existe; si la imagen no se puede borrar solo queda un archivo suelto.
    try:
        await delete_cover((deleted.get("portada") or {}).get("archivo"))
    except OSError:
        pass
    return ApiResponse(
        {
            "success": True,
            "message": "Libro eliminado exitosamente",
            "data": {"_id": deleted["_id"], "titulo": deleted["titulo"]},
        }
    )
