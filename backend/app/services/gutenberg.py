"""Reglas para importar libros pequeños de Project Gutenberg: leer sus metadatos, limpiar el texto,
repartirlo en páginas y elegir cuáles entran (ver docs/adr/0013-importar-libros-de-gutenberg.md).

Son funciones puras, sin red ni base de datos; las usa `scripts/import_gutenberg.py`.
"""

from __future__ import annotations

import re
import tarfile
from pathlib import Path
from typing import Iterator
from xml.etree import ElementTree

from ..text_utils import clean_text, fold_text
from .analysis.categories import detect_categories
from .analysis.language import get_stopwords
from .analysis.synopsis import build_synopsis, truncate

#: Páginas mínimas y máximas de un libro importado.
MIN_PAGES, MAX_PAGES = 30, 50
#: Una página se cierra al llegar a este número de caracteres...
TARGET_CHARS = 1800
#: ...y nunca pasa de este.
MAX_CHARS = 2200
#: Tamaño del `.txt` (con la licencia incluida) fuera del cual no vale la pena descargarlo.
MIN_TEXT_BYTES, MAX_TEXT_BYTES = 62_000, 140_000
#: Idiomas que se importan.
LANGUAGES = ("es", "en")
#: Ilustraciones por página a partir de las cuales el libro depende de unas imágenes que no se importan.
MAX_FIGURES_PER_PAGE = 0.5

_NS = {
    "dcterms": "http://purl.org/dc/terms/",
    "pgterms": "http://www.gutenberg.org/2009/pgterms/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
}
_RDF_VALUE = f"{{{_NS['rdf']}}}value"
_RDF_ABOUT = f"{{{_NS['rdf']}}}about"

_START = re.compile(r"^\*\*\*\s*START OF TH(?:E|IS) PROJECT GUTENBERG.*?\*\*\*[ \t]*$", re.M | re.S | re.I)
_END = re.compile(r"^\*\*\*\s*END OF TH(?:E|IS) PROJECT GUTENBERG", re.M | re.I)
#: Párrafos que no son del libro: créditos de la transcripción y menciones a la marca.
_BOILERPLATE = re.compile(r"project\s+gutenberg|pgdp\.net|distributed\s+proofread|gutenberg\.org", re.I)
_CREDITS = re.compile(r"^(produced by|e-?text prepared by|transcribed (from|by)|this e-?(book|text) was)", re.I)
#: Notas de quien transcribió el libro, estén donde estén.
_TRANSCRIBER = re.compile(r"^\W*transcriber['’]?s?['’]?\s+note|\be-?(book|text)\b", re.I)
_ILLUSTRATION = re.compile(r"\[(?:Illustration|Ilustraci[oó]n)(?:\s*:\s*([^\[\]]*))?\]", re.I)
_ITALICS = re.compile(r"(?<!\w)_(?=\S)|(?<=\S)_(?!\w)")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f﻿]")

#: Publicaciones periódicas, índices, recopilaciones y tomos sueltos: no son libros completos.
_NOT_A_BOOK = re.compile(
    r"\b(magazine|journal|gazette|punch|quarterly|weekly|monthly|bulletin|periodicals?|index(es)? of|indexes|"
    r"catalog(ue)?s?|quotes and images|quotations|dictionar(y|ies)|vol\.|volumen?\s+[\divxl]+|tomo\s+[\divxl]+|"
    r"part\s+(\d+|[ivx]+)|parte\s+(\d+|[ivx]+)|book\s+\d+|chapters\s+\d+|no\.\s*\d+)(?!\w)",
    re.I,
)
#: Materias de contenido para adultos. No incluye la estantería "Sexuality & Erotica", que también
#: agrupa libros de educación sexual.
_ADULT = re.compile(r"erotic (fiction|literature|poetry|stories)|pornograph|sadomasochis|flagellation", re.I)
_NAME_SUFFIXES = {"jr.", "sr.", "ii", "iii", "iv"}
_UNKNOWN_AUTHORS = {"anonymous", "unknown", "various", "anonimo", "varios"}
_AUTO_SUMMARY = re.compile(r"\s*\(This is an automatically generated summary\.\)\s*$", re.I)


# --- Metadatos (RDF) -------------------------------------------------------


def _values(ebook, path: str) -> list[str]:
    return [node.text.strip() for node in ebook.findall(f"{path}//{_RDF_VALUE}", _NS) if node.text]


def parse_rdf(xml: bytes) -> dict | None:
    """Metadatos de un libro a partir de su RDF, o `None` si no es un texto en dominio público (en EE. UU.),
    en un solo idioma admitido y con un `.txt` de tamaño compatible."""
    ebook = ElementTree.fromstring(xml).find("pgterms:ebook", _NS)
    if ebook is None:
        return None
    languages = _values(ebook, "dcterms:language")
    if len(languages) != 1 or languages[0] not in LANGUAGES or _values(ebook, "dcterms:type") != ["Text"]:
        return None
    if not (ebook.findtext("dcterms:rights", "", _NS)).startswith("Public domain"):
        return None

    size = 0
    for file in ebook.findall("dcterms:hasFormat/pgterms:file", _NS):
        if file.get(_RDF_ABOUT, "").endswith(".txt.utf-8"):
            size = int(file.findtext("dcterms:extent", "0", _NS) or 0)
    if not MIN_TEXT_BYTES <= size <= MAX_TEXT_BYTES:
        return None

    number = ebook.get(_RDF_ABOUT, "").rsplit("/", 1)[-1]
    title = (ebook.findtext("dcterms:title", "", _NS) or "").strip()
    if not number.isdigit() or not title:
        return None
    # El catálogo separa a veces el subtítulo con la marca bibliográfica "$b".
    title = re.sub(r"\s*:?\s*\$b\s*", "\n", title)
    return {
        "id": int(number),
        "titulo": ": ".join(part.strip(" :;") for part in title.splitlines() if part.strip())[:250],
        "autores": [
            name
            for name in (
                natural_name(node.text or "")
                for node in ebook.findall("dcterms:creator/pgterms:agent/pgterms:name", _NS)
            )
            if name
        ],
        "idioma": languages[0],
        "materias": _values(ebook, "dcterms:subject") + _values(ebook, "pgterms:bookshelf"),
        "resumen": (ebook.findtext("pgterms:marc520", "", _NS) or "").strip(),
        "descargas": int(ebook.findtext("pgterms:downloads", "0", _NS) or 0),
        "bytes": size,
    }


def read_catalog(archive: Path) -> Iterator[dict]:
    """Recorre `rdf-files.tar.bz2` sin extraerlo a disco y entrega los libros que pasan `parse_rdf`."""
    with tarfile.open(archive, "r|bz2") as tar:
        for member in tar:
            if not (member.isfile() and member.name.endswith(".rdf")):
                continue
            try:
                book = parse_rdf(tar.extractfile(member).read())
            except (ElementTree.ParseError, ValueError):
                continue
            if book:
                yield book


def natural_name(name: str) -> str:
    """`"Pérez Galdós, Benito"` → `"Benito Pérez Galdós"`; vacío si el autor es desconocido.
    Quita fechas de actividad y títulos nobiliarios o de cortesía (conserva "Jr.", "Sr." y "Mrs.")."""
    name = re.sub(r"\s*\([^)]*\)", "", name).strip()
    if fold_text(name) in _UNKNOWN_AUTHORS:
        return ""
    last, *rest = [part.strip() for part in name.split(",")]
    if not rest or rest[0].startswith("active "):
        return last
    first, suffixes = rest[0], rest[1:]
    if first.startswith("of "):
        return f"{last} {first}"
    # En los títulos nobiliarios el apellido viene repetido: "Byron, George Gordon Byron, Baron".
    full = first if first.split()[-1:] == [last] else f"{first} {last}".strip()
    if "Mrs." in suffixes:
        return f"Mrs. {full}"
    return ", ".join([full, *(suffix for suffix in suffixes if suffix.lower() in _NAME_SUFFIXES)])


def book_key(title: str, authors: list[str]) -> str:
    """Clave para reconocer el mismo libro: título y primer autor, sin acentos ni mayúsculas."""
    return f"{fold_text(title)}|{fold_text(authors[0]) if authors else ''}"


def select_candidates(books: list[dict], imported_ids: set[int], existing_keys: set[str]) -> list[dict]:
    """Ordena los candidatos (primero todos los de español; dentro de cada idioma, los más descargados)
    y quita los ya importados, los repetidos, el contenido para adultos y lo que no es un libro completo."""
    seen = set(existing_keys)
    chosen = []
    for book in sorted(books, key=lambda b: (LANGUAGES.index(b["idioma"]), -b["descargas"], b["id"])):
        key = book_key(book["titulo"], book["autores"])
        if book["id"] in imported_ids or key in seen:
            continue
        described = " | ".join([book["titulo"], *book["materias"]])
        if _NOT_A_BOOK.search(described) or _ADULT.search(described):
            continue
        seen.add(key)
        chosen.append(book)
    return chosen


# --- Texto -----------------------------------------------------------------


def extract_paragraphs(text: str) -> list[str]:
    """Párrafos del libro sin la cabecera, la licencia, los créditos ni las marcas de cursiva.
    Lista vacía si el archivo no tiene las marcas de inicio y fin esperadas."""
    text = _CONTROL.sub("", text.replace("\r\n", "\n").replace("\r", "\n"))
    start = _START.search(text)
    end = _END.search(text, start.end()) if start else None
    if not start or not end:
        return []

    paragraphs = []
    for block in re.split(r"\n[ \t]*\n", text[start.end() : end.start()]):
        block = _ILLUSTRATION.sub(lambda m: f"[[figura]] {m.group(1).strip()}" if (m.group(1) or "").strip() else "", block)
        lines = [_ITALICS.sub("", line.strip()) for line in block.split("\n")]
        paragraph = "\n".join(line for line in lines if line)
        if not paragraph or _BOILERPLATE.search(paragraph) or _TRANSCRIBER.search(paragraph):
            continue
        if len(paragraphs) < 5 and _CREDITS.match(paragraph):
            continue
        paragraphs.append(paragraph)
    return paragraphs


def is_picture_book(text: str, pages: int) -> bool:
    """Si el texto tiene tantas ilustraciones por página que sin ellas el libro queda incompleto."""
    return len(_ILLUSTRATION.findall(text)) > pages * MAX_FIGURES_PER_PAGE


def _split_long(paragraph: str) -> list[str]:
    """Parte un párrafo que no cabe en una página: por líneas y, si una sola no cabe, por palabras."""
    pieces, current = [], ""
    for line in paragraph.split("\n"):
        words = [line] if len(line) <= TARGET_CHARS else line.split(" ")
        for index, unit in enumerate(words):
            joiner = " " if index else "\n"
            if current and len(current) + len(unit) + 1 > TARGET_CHARS:
                pieces.append(current)
                current = unit
            else:
                current = f"{current}{joiner}{unit}" if current else unit
    if current:
        pieces.append(current)
    return pieces


def paginate(paragraphs: list[str]) -> list[dict]:
    """Reparte los párrafos en páginas `[{"pagina", "texto"}]` de unos `TARGET_CHARS` caracteres."""
    pages: list[str] = []
    current = ""
    for paragraph in paragraphs:
        for piece in [paragraph] if len(paragraph) <= TARGET_CHARS else _split_long(paragraph):
            if current and len(current) + len(piece) + 2 > MAX_CHARS:
                pages.append(current)
                current = ""
            current = f"{current}\n\n{piece}" if current else piece
            if len(current) >= TARGET_CHARS:
                pages.append(current)
                current = ""
    if current:
        pages.append(current)
    return [{"pagina": number, "texto": text} for number, text in enumerate(pages, start=1)]


def describe(book: dict, pages: list[dict]) -> dict:
    """Datos del libro listos para `parse_book_metadata`: categorías según las materias y el texto, y
    sinopsis. El resumen de Gutenberg está en inglés, así que solo se usa en libros en inglés."""
    sample = "\n\n".join(page["texto"] for page in pages[:20])
    categories = detect_categories(sample, title=book["titulo"], hints=book["materias"]) or ["Clásicos"]
    summary = _AUTO_SUMMARY.sub("", book["resumen"]) if book["idioma"] == "en" else ""
    if summary:
        synopsis = truncate(summary)
    else:
        built = build_synopsis(None, [], pages, title=book["titulo"], stopwords=get_stopwords(book["idioma"]))
        synopsis = built["texto"] if built else ""
    return {
        "titulo": clean_text(book["titulo"]),
        "autores": [{"nombre": name} for name in book["autores"]],
        "idioma": book["idioma"],
        "categorias": categories,
        "sinopsis": synopsis,
    }
