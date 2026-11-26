"""Importa libros pequeños (30-50 páginas) de Project Gutenberg, en español e inglés.

Va en dos pasos. `plan` descarga y elige los libros y deja la lista para revisarla: **solo lee**
la base de datos. `apply` guarda exactamente esa lista. Repetir `apply` no duplica nada.

Uso (desde backend/):
    python -m scripts.import_gutenberg plan --total 358
    python -m scripts.import_gutenberg apply --owner admin@gmail.com --yes

Las descargas van al espejo para programas (nunca a www.gutenberg.org), una a la vez y con pausa.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import http.client
import json
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from app import db
from app.config import get_limits, load_env
from app.errors import AppError
from app.services import gutenberg
from app.services.book_ingest import parse_book_metadata, save_book_with_pages
from app.services.cover_image import detect_image_mime

MIRROR = "https://gutenberg.pglaf.org/cache/epub"
USER_AGENT = "libreria-importer/1.0"
#: Segundos entre descargas.
DELAY = 2.0
DEFAULT_DATA_DIR = Path(tempfile.gettempdir()) / "libreria-gutenberg"

_last_request = 0.0


def download(url: str, target: Path, retries: int = 3) -> Path | None:
    """Descarga `url` en `target` (si no está ya), respetando la pausa. `None` si no existe o falla."""
    global _last_request
    if target.is_file() and target.stat().st_size:
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(retries):
        time.sleep(max(0.0, _last_request + DELAY - time.monotonic()))
        _last_request = time.monotonic()
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            partial = target.with_name(target.name + ".part")
            with urllib.request.urlopen(request, timeout=300) as response, partial.open("wb") as handle:
                while chunk := response.read(1 << 20):
                    handle.write(chunk)
            partial.replace(target)
            return target
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if error.code in (403, 429):  # el servidor pide parar: no se insiste
                raise SystemExit(f"El espejo rechazó la descarga (HTTP {error.code}). Inténtalo más tarde.") from None
        except (OSError, http.client.HTTPException):  # incluye las descargas cortadas a medias
            pass
        time.sleep(15 * (attempt + 1))
    return None


def load_book(book_id: int, data_dir: Path) -> tuple[str, list[dict]]:
    """Texto y páginas de un libro a partir de su `.txt` (lo descarga si falta); vacíos si no se pudo."""
    path = download(f"{MIRROR}/{book_id}/pg{book_id}.txt", data_dir / "textos" / f"{book_id}.txt")
    if not path:
        return "", []
    text = path.read_text(encoding="utf-8", errors="replace")
    return text, gutenberg.paginate(gutenberg.extract_paragraphs(text))


async def existing_books(database) -> tuple[set[int], set[str]]:
    """Ids de Gutenberg ya importados y claves título+autor de todos los libros."""
    ids, keys = set(), set()
    async for book in database.books.find({}, {"titulo": 1, "autores.nombre": 1, "origen": 1}):
        origin = book.get("origen") or {}
        if origin.get("fuente") == "gutenberg" and origin.get("id") is not None:
            ids.add(int(origin["id"]))
        keys.add(gutenberg.book_key(book.get("titulo", ""), [a.get("nombre", "") for a in book.get("autores") or []]))
    return ids, keys


async def plan(total: int, data_dir: Path) -> int:
    """Elige hasta `total` libros y escribe `plan.json` y `lista.csv` en `data_dir`."""
    load_env()
    database = await db.connect()
    try:
        imported, keys = await existing_books(database)
    finally:
        await db.disconnect()
    print(f"En la base: {len(imported)} libros de Gutenberg.", flush=True)

    catalog = data_dir / "candidatos.json"
    if not catalog.is_file():
        print("Descargando el catálogo (unos 130 MB)...", flush=True)
        archive = download(f"{MIRROR}/feeds/rdf-files.tar.bz2", data_dir / "rdf-files.tar.bz2")
        if not archive:
            print("No se pudo descargar el catálogo.")
            return 1
        print("Leyendo el catálogo...", flush=True)
        catalog.write_text(json.dumps(list(gutenberg.read_catalog(archive)), ensure_ascii=False), encoding="utf-8")
    candidates = gutenberg.select_candidates(json.loads(catalog.read_text(encoding="utf-8")), imported, keys)
    by_language = {code: sum(b["idioma"] == code for b in candidates) for code in gutenberg.LANGUAGES}
    print(f"Candidatos por tamaño: {by_language}", flush=True)

    selected: list[dict] = []
    for book in candidates:
        if len(selected) >= total:
            break
        text, pages = load_book(book["id"], data_dir)
        if not gutenberg.MIN_PAGES <= len(pages) <= gutenberg.MAX_PAGES:
            continue
        if gutenberg.is_picture_book(text, len(pages)):
            continue
        meta = gutenberg.describe(book, pages)
        selected.append({"id": book["id"], "paginas": len(pages), "descargas": book["descargas"], "datos": meta})
        if len(selected) % 25 == 0:
            print(f"  {len(selected)}/{total} elegidos", flush=True)

    (data_dir / "plan.json").write_text(json.dumps(selected, ensure_ascii=False, indent=1), encoding="utf-8")
    # `utf-8-sig` para que Excel muestre bien los acentos.
    with (data_dir / "lista.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["id_gutenberg", "idioma", "paginas", "titulo", "autores", "categorias"])
        for item in selected:
            meta = item["datos"]
            writer.writerow([
                item["id"], meta["idioma"], item["paginas"], meta["titulo"],
                "; ".join(a["nombre"] for a in meta["autores"]), "; ".join(meta["categorias"]),
            ])
    counts = {code: sum(i["datos"]["idioma"] == code for i in selected) for code in gutenberg.LANGUAGES}
    print(f"Plan listo: {len(selected)} libros {counts}. No se escribió nada en la base de datos.")
    print(f"Revisa: {data_dir / 'lista.csv'}")
    return 0 if len(selected) == total else 2


async def apply(owner: str, data_dir: Path) -> int:
    """Guarda los libros de `plan.json` a nombre de `owner` (correo o nombre de usuario)."""
    plan_file = data_dir / "plan.json"
    if not plan_file.is_file():
        print(f"No hay plan en {plan_file}. Ejecuta primero `plan`.")
        return 1
    selected = json.loads(plan_file.read_text(encoding="utf-8"))
    batch = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%MZ")

    load_env()
    database = await db.connect()
    saved = skipped = failed = covers = 0
    try:
        user = await database.users.find_one(
            {"$or": [{"correo": owner.lower()}, {"nombre_usuario": owner}]}, {"tipo_usuario": 1, "nombre_usuario": 1}
        )
        if not user or user.get("tipo_usuario") not in ("uploader", "admin"):
            print(f'"{owner}" no existe o no puede ser dueño de libros (uploader o admin).')
            return 1
        imported, _ = await existing_books(database)
        print(f"Dueño: {user['nombre_usuario']}. Lote: {batch}.", flush=True)

        for position, item in enumerate(selected, start=1):
            book_id = item["id"]
            if book_id in imported:
                skipped += 1
                continue
            _, pages = load_book(book_id, data_dir)
            if len(pages) != item["paginas"]:
                print(f"  · {book_id}: el texto no coincide con el plan; se omite.")
                failed += 1
                continue
            cover = None
            image = download(f"{MIRROR}/{book_id}/pg{book_id}.cover.medium.jpg", data_dir / "portadas" / f"{book_id}.jpg")
            if image:
                data = image.read_bytes()
                mime = detect_image_mime(data)
                if mime and len(data) <= get_limits().max_cover_bytes:
                    cover = {"data": data, "mime": mime}
            meta = parse_book_metadata(item["datos"])
            meta["origen"] = {
                "fuente": "gutenberg", "id": book_id, "lote": batch,
                "min_paginas": gutenberg.MIN_PAGES, "max_paginas": gutenberg.MAX_PAGES,
            }
            try:
                await save_book_with_pages(meta, pages, cover, user["_id"])
            except AppError as error:
                if error.code != "DUPLICATE_BOOK":
                    raise
                skipped += 1
                continue
            saved += 1
            covers += cover is not None
            if position % 25 == 0:
                print(f"  {position}/{len(selected)} procesados, {saved} guardados", flush=True)
    finally:
        await db.disconnect()
    print(f"Guardados: {saved} ({covers} con portada). Omitidos por repetidos: {skipped}. Fallidos: {failed}.")
    return 0 if not failed else 2


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR, help="carpeta de descargas y del plan")
    steps = parser.add_subparsers(dest="step", required=True)
    plan_step = steps.add_parser("plan", help="elige los libros sin escribir en la base de datos")
    plan_step.add_argument("--total", type=int, default=358, help="cuántos libros elegir")
    apply_step = steps.add_parser("apply", help="guarda en la base de datos los libros del plan")
    apply_step.add_argument("--owner", required=True, help="correo o nombre del usuario dueño")
    apply_step.add_argument("--yes", action="store_true", help="confirma que se escribirá en la base de datos")
    args = parser.parse_args()
    data_dir = args.data_dir.resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    if args.step == "plan":
        return asyncio.run(plan(args.total, data_dir))
    if not args.yes:
        print("Esto escribe libros en la base de datos. Revisa la lista y repite con --yes.")
        return 1
    return asyncio.run(apply(args.owner, data_dir))


if __name__ == "__main__":
    sys.exit(main())
