"""Detecta en qué página empieza el contenido de un libro, saltándose portada, créditos, índice,
prefacio y demás páginas previas.

Es una heurística sobre el texto de las primeras páginas (ver docs/adr/0011-saltar-al-contenido.md):
reconoce páginas de índice (puntos guía o un encabezado "Índice"), páginas preliminares
(créditos, prólogo, dedicatoria...) y el arranque del libro (un encabezado "Capítulo 1",
"Unidad I" o "Introducción"). Si no encuentra páginas preliminares devuelve `None`: no hay nada
que saltar.
"""

from __future__ import annotations

import regex as re

from .text_utils import fold

#: Cuántas páginas del principio se examinan como máximo (y como mucho la cuarta parte del libro).
MAX_WINDOW = 120
MIN_WINDOW = 30
#: Páginas seguidas sin contenido preliminar tras las cuales se da por terminada la zona preliminar.
GAP = 6
#: Cuántas páginas después de la zona preliminar se busca el separador antes del primer capítulo.
LOOKAHEAD = 15
#: Una página con menos caracteres que esto cuenta como casi vacía; con más que `DENSE_CHARS`, como de texto.
SPARSE_CHARS = 25
DENSE_CHARS = 200
#: Un encabezado de capítulo solo cuenta en una página con al menos este texto (no en una portada de capítulo vacía).
MARKER_MIN_CHARS = 120

TOC, FRONT, MARKER, TEXT, BLANK = "indice", "preliminar", "inicio", "texto", "vacia"

#: Línea de índice: puntos guía (`....`, `. . . .`, `…`) y, casi siempre, el número de página (a veces va en otra línea).
_LEADER = re.compile(r"(?:\.{3,}|(?:\. ){3,}\.?|…{2,})\s*[\divxlcdm]{0,6}\s*$", re.IGNORECASE)
_INDEX_HEADING = re.compile(
    r"^\s*(?:indice(?: general| de contenidos?)?|contenidos?|tabla de contenidos?|sumario|table of contents|contents)\s*$"
)
_FRONT_HEADING = re.compile(
    r"^\s*(?:prologo|prefacio|presentacion|agradecimientos?|dedicatoria|preface|foreword|acknowledg(?:e)?ments?|"
    r"about the (?:book|authors?)|about this book|sobre (?:el|este) libro|sobre (?:el|los|las) autor(?:es|as)?|"
    r"nota (?:del|al) (?:autor|editor|lector)|aviso legal|creditos?|copyright|licencia)\b"
)
_LEGAL = re.compile(
    r"\bisbn\b|todos los derechos reservados|all rights reserved|deposito legal|queda prohibida|"
    r"(?:\(c\)|©)\s*(?:19|20)\d\d|impreso en|printed in"
)
_MARKER = re.compile(
    r"^\s*(?:capitulo|chapter|unidad|parte|part|tema|leccion|modulo|seccion|introduccion|introduction)\b"
)


def _lines(text: str) -> list[str]:
    return [line.strip() for line in text.split("\n") if line.strip()]


def _classify(text: str) -> str:
    """Tipo de una página según su texto: `indice`, `preliminar`, `inicio`, `texto` o `vacia`."""
    text = text or ""
    if len(text.strip()) < SPARSE_CHARS:
        return BLANK
    lines = _lines(text)
    folded = [fold(line) for line in lines]
    head = folded[:6]

    leaders = sum(1 for line in lines if _LEADER.search(line))
    if len(lines) >= 4 and leaders >= 4 and leaders / len(lines) >= 0.25:
        return TOC
    if any(_INDEX_HEADING.match(line) for line in head[:4]) and len(text) < 3500:
        return TOC

    if any(len(line) <= 60 and _FRONT_HEADING.match(line) for line in head[:4]):
        return FRONT
    if _LEGAL.search(fold(text)):
        return FRONT

    if len(text.strip()) >= MARKER_MIN_CHARS and any(len(line) <= 70 and _MARKER.match(line) for line in head):
        return MARKER
    return TEXT


def detect_content_start(pages: list[dict]) -> int | None:
    """Número de página (desde 1) donde empieza el contenido, o `None` si no se detectaron páginas
    previas que saltar. `pages` es `[{"pagina": n, "texto": "..."}, ...]` en orden."""
    ordered = sorted(pages, key=lambda page: page["pagina"])
    total = len(ordered)
    if total < 4:
        return None
    window = min(total, max(MIN_WINDOW, total // 4), MAX_WINDOW)
    kinds = [_classify(page.get("texto") or "") for page in ordered[:window]]
    sizes = [len((page.get("texto") or "").strip()) for page in ordered[:window]]

    last_front = 0  # número (desde 1) de la última página preliminar
    for index, kind in enumerate(kinds):
        if kind in (TOC, FRONT):
            last_front = index + 1
        elif kind == MARKER and last_front > 0:
            return _result(ordered, index)
        elif last_front > 0 and index + 1 - last_front > GAP:
            break
    if last_front == 0:
        return None

    # Sin encabezado de capítulo: un hueco (página casi vacía) seguido de texto suele separar el prefacio
    # del primer capítulo; si no lo hay, el contenido empieza en la primera página con texto.
    end = min(window, last_front + LOOKAHEAD)
    for index in range(last_front, end - 1):
        if sizes[index] < SPARSE_CHARS and sizes[index + 1] >= DENSE_CHARS:
            return _result(ordered, index + 1)
    for index in range(last_front, window):
        if sizes[index] >= DENSE_CHARS:
            return _result(ordered, index)
    return None


def _result(ordered: list[dict], index: int) -> int | None:
    """Número de página de `ordered[index]`; `None` si es una de las dos primeras (no hay nada que saltar)."""
    number = ordered[index]["pagina"]
    return number if number >= 3 else None
