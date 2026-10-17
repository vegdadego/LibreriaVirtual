"""Lo que el propio PDF declara: título, autores, descripción, palabras clave, idioma y editorial."""

from __future__ import annotations

import html
from typing import Callable

import regex as re

from .front_matter import split_authors, strip_saga_from_title

#: Idiomas que sabe elegir el formulario (ver `src/features/libros/domain/idiomas.js`).
SUPPORTED_LANGUAGES = frozenset({"es", "en", "pt", "fr", "it", "de", "ca", "la", "ja", "zh", "ru", "ko"})

#: Títulos que los programas ponen por defecto o que son nombres de archivo.
JUNK_TITLE = re.compile(
    r"^(microsoft word|untitled|sin t[ií]tulo|documento\b|document\b|portada\b|cover\b|libro$|book$|layout|diapositiva|presentaci[oó]n)|\.(docx?|pdf|indd|qxd|pub|odt|tex|rtf|txt)$|^[\d\W_]+$",
    re.I,
)

_XMP_BLOCK = r"<{tag}\b[^>]*>(.*?)</{tag}>"
_XMP_ITEM = re.compile(r"<rdf:li\b[^>]*>(.*?)</rdf:li>", re.S)
_XMP_TAGS = re.compile(r"<[^>]+>")


def xmp_reader(xml: str | None) -> Callable[[str], str]:
    """Función `get("dc:creator")` que devuelve el valor de un campo XMP como texto (los valores
    de una lista se unen con "; ")."""
    xml = xml or ""

    def get(name: str) -> str:
        block = re.search(_XMP_BLOCK.format(tag=re.escape(name)), xml, re.S)
        if not block:
            return ""
        inner = block.group(1)
        items = _XMP_ITEM.findall(inner) or [inner]
        values = [html.unescape(_XMP_TAGS.sub("", item)).strip() for item in items]
        return "; ".join(value for value in values if value)

    return get


def read_pdf_metadata(info: dict | None = None, xmp: Callable[[str], str] | None = None) -> dict:
    """Mezcla el diccionario de información clásico (`Info`: claves `Title`, `Author`, `Subject`,
    `Keywords`, `Language`) con los metadatos XMP; los valores de relleno de los programas
    ("Microsoft Word - doc1", "Administrador") se descartan."""
    info = info or {}
    get_xmp = xmp or (lambda _name: "")

    def info_text(key: str) -> str:
        value = info.get(key)
        return value.strip() if isinstance(value, str) else ""

    raw_title = re.sub(r"\s+-\s+Microsoft Word$", "", get_xmp("dc:title") or info_text("Title"), flags=re.I).strip()
    original = "" if JUNK_TITLE.search(raw_title) or len(raw_title) < 2 or len(raw_title) > 200 else raw_title
    title = strip_saga_from_title(original) or None

    language = re.split(r"[-_;\s]", (get_xmp("dc:language") or info_text("Language")).lower())[0]
    return {
        "titulo": title if title and len(title) <= 150 else None,
        "titulo_original": original,
        "autores": split_authors(get_xmp("dc:creator") or info_text("Author")),
        "descripcion": get_xmp("dc:description"),
        "pistas": [text for text in (info_text("Subject"), info_text("Keywords"), get_xmp("dc:subject")) if text],
        "idioma": language if language in SUPPORTED_LANGUAGES else None,
        "editorial": get_xmp("dc:publisher") or None,
    }
