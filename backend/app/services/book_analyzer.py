"""Propone los datos de un libro a partir de su PDF para rellenar el formulario de subida.

Todo se calcula con reglas sobre los metadatos del PDF y su texto, sin servicios externos
(ver docs/adr/0006-autodeteccion-de-datos-del-libro.md). Esta función corre dentro de un
proceso del pool (ver `pdf_worker.analyze`).
"""

from __future__ import annotations

from .analysis.categories import detect_categories
from .analysis.front_matter import (
    detect_authors_from_text,
    detect_edition,
    detect_publication_date,
    detect_publisher,
    detect_saga,
)
from .analysis.language import detect_language, get_stopwords
from .analysis.pdf_info import read_pdf_metadata, xmp_reader
from .analysis.synopsis import build_synopsis
from .pdf_worker import page_text

#: Páginas del principio donde suele estar la página de créditos.
FRONT_PAGES = 12
#: Páginas del final donde a veces están el colofón o la contraportada.
BACK_PAGES = 3
#: Páginas del arranque que se leen para el idioma, las categorías y el resumen.
SAMPLE_PAGES = 40
#: Tope de texto que se analiza, en caracteres.
MAX_SAMPLE_CHARS = 80000

_INFO_KEYS = {"title": "Title", "author": "Author", "subject": "Subject", "keywords": "Keywords"}


def _read_pages(doc) -> tuple[list[dict], list[dict], list[dict]]:
    """Texto de las páginas necesarias: `(portada y créditos, muestra, final)`."""
    total = doc.page_count
    sample_end = min(total, SAMPLE_PAGES)
    numbers = set(range(1, sample_end + 1)) | set(range(max(sample_end + 1, total - BACK_PAGES + 1), total + 1))
    pages = [{"pagina": n, "texto": page_text(doc[n - 1])} for n in sorted(numbers)]
    front = [p for p in pages if p["pagina"] <= min(total, FRONT_PAGES)]
    sample = [p for p in pages if p["pagina"] <= sample_end]
    back = [p for p in pages if p["pagina"] > total - BACK_PAGES]
    return front, sample, back


def analyze_document(doc) -> dict:
    """Datos detectados de un documento PyMuPDF abierto.

    Solo incluye los campos que logró detectar: `titulo`, `autores`, `categorias`,
    `empresa_edicion`, `fecha_publicacion` (+ `fecha_precision`), `numero_edicion`, `saga`,
    `numero_en_saga`, `idioma` y `sinopsis`. `fuentes` dice de dónde salió cada uno
    (`metadatos` del PDF, `texto` del libro o `inferido` por cálculo).
    """
    raw = doc.metadata or {}
    info = {key: raw.get(source) for source, key in _INFO_KEYS.items()}
    try:
        xmp = xmp_reader(doc.get_xml_metadata())
    except Exception:  # noqa: BLE001 — un XMP ilegible no impide analizar el resto
        xmp = None
    meta = read_pdf_metadata(info, xmp)
    front, sample, back = _read_pages(doc)

    credits_text = "\n\n".join(p["texto"] for p in [*front, *back])
    sample_text = "\n\n".join(p["texto"] for p in sample)[:MAX_SAMPLE_CHARS]

    result: dict = {}
    fuentes: dict[str, str] = {}

    def put(field: str, value, source: str) -> None:
        if value is None or value == "" or (isinstance(value, list) and not value):
            return
        result[field] = value
        fuentes[field] = source

    put("titulo", meta["titulo"], "metadatos")

    # Idioma: el texto manda; el metadato del PDF a veces trae el idioma del programa, no del libro.
    language = detect_language(sample_text)
    if language:
        put("idioma", language, "texto")
    else:
        put("idioma", meta["idioma"], "metadatos")

    if meta["autores"]:
        put("autores", meta["autores"], "metadatos")
    else:
        put("autores", detect_authors_from_text(credits_text), "texto")

    edition = detect_edition(credits_text)
    put("numero_edicion", edition, "texto")

    published = detect_publication_date(credits_text, prefer_latest=bool(edition and edition > 1))
    if published:
        put("fecha_publicacion", published["fecha"], "texto")
        put("fecha_precision", published["precision"], "texto")

    publisher = detect_publisher(credits_text)
    put("empresa_edicion", publisher or meta["editorial"], "texto" if publisher else "metadatos")

    saga = detect_saga(f"{meta['titulo_original']}\n{credits_text}")
    if saga:
        put("saga", saga["saga"], "texto")
        put("numero_en_saga", saga["numero"], "texto")

    put(
        "categorias",
        detect_categories(
            sample_text,
            title=meta["titulo"] or "",
            hints=meta["pistas"],
            year=int(published["fecha"][:4]) if published else None,
        ),
        "inferido",
    )

    synopsis = build_synopsis(
        meta["descripcion"],
        blurb_pages=[*back, *front[:8]],
        body_pages=sample,
        title=meta["titulo"] or "",
        stopwords=get_stopwords(result.get("idioma")),
    )
    if synopsis:
        source = {"metadatos": "metadatos", "libro": "texto"}.get(synopsis["origen"], "inferido")
        put("sinopsis", synopsis["texto"], source)

    return {**result, "fuentes": fuentes, "paginas_analizadas": len(sample)}
