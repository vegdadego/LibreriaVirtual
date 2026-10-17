"""Sinopsis automática, sin servicios externos y en tres intentos:

1. la descripción que trae el propio PDF,
2. un apartado "Sinopsis" / "Reseña" escrito en el libro (contraportada, solapa),
3. un resumen extractivo: las frases más representativas del arranque, tomadas literalmente.
"""

from __future__ import annotations

from math import sqrt

import regex as re

from .text_utils import flatten, fold, tokenize

MAX_LENGTH = 700
MIN_BLURB = 120

#: Encabezados que anuncian la sinopsis dentro del libro.
BLURB_HEADING = re.compile(
    r"^(?:sinopsis|resumen|rese[nñ]a|argumento|descripci[oó]n|sobre (?:el|este) libro|acerca de(?:l)? (?:este )?libro|synopsis|summary|description|about the book|about this book|blurb)\s*:?\s*$",
    re.I,
)
BLURB_INLINE = re.compile(r"^(?:sinopsis|synopsis|rese[nñ]a)\s*:\s*(.{80,})$", re.I)


def truncate(text: str, maximum: int = MAX_LENGTH) -> str:
    """Corta un texto en el último punto antes de `maximum` caracteres."""
    if len(text) <= maximum:
        return text
    cut = text[:maximum]
    last_stop = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if last_stop > maximum * 0.5:
        return cut[: last_stop + 1]
    return re.sub(r"\s+\S*$", "", cut) + "…"


def looks_like_prose(text: str) -> bool:
    """¿Parece prosa y no una lista de palabras clave o un nombre de archivo?"""
    return len(text) >= 80 and len(re.findall(r"[.!?]", text)) >= 1 and len(text.split()) >= 15


def find_blurb(pages: list[dict]) -> str | None:
    """Apartado de sinopsis escrito en el libro: un encabezado ("Sinopsis") seguido de uno o más
    párrafos, o una línea "Sinopsis: ..."."""
    for page in pages:
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", page["texto"]) if p.strip()]
        for index, paragraph in enumerate(paragraphs):
            inline = BLURB_INLINE.match(flatten(paragraph))
            if inline and len(inline.group(1)) >= MIN_BLURB:
                return truncate(inline.group(1))

            # El encabezado puede ser la primera línea del párrafo o un párrafo propio.
            first, *rest = paragraph.split("\n")
            if not BLURB_HEADING.match(first.strip()):
                continue
            body = [part for part in [flatten("\n".join(rest)), *paragraphs[index + 1 :]] if part]
            blurb = ""
            for part in body:
                if BLURB_HEADING.match(part.strip()) or len(part) < 40:
                    break
                blurb += (" " if blurb else "") + flatten(part)
                if len(blurb) >= MIN_BLURB * 3:
                    break
            if len(blurb) >= MIN_BLURB:
                return truncate(blurb)
    return None


#: Páginas con aspecto de créditos o índice, que no sirven para resumir.
NOT_BODY = re.compile(
    r"(isbn|todos los derechos|all rights reserved|derechos reservados|copyright|©|indice|contenido|table of contents|dep[oó]sito legal|impreso en|printed in)",
    re.I,
)
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«“\"])")
_DIALOGUE_START = re.compile(r"^[—–«“\"'‘-]")
_DIALOGUE_ANY = re.compile(r"[«»“”\"—]")
_CHAPTER = re.compile(r"^(cap[ií]tulo|chapter|parte|part)\b", re.I)


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def is_usable_sentence(sentence: str) -> bool:
    """Frases que sirven como resumen: de longitud media, narrativas y sin diálogo."""
    return (
        60 <= len(sentence) <= 260
        and not _DIALOGUE_START.match(sentence)
        and not _DIALOGUE_ANY.search(sentence)
        and not re.search(r"\d{3,}", sentence)
        and not _CHAPTER.match(sentence)
        and sentence != sentence.upper()
    )


def _overlap(a: str, b: str) -> float:
    """Parecido entre dos frases (0 a 1), para no repetir ideas en el resumen."""
    set_a, set_b = set(tokenize(a)), set(tokenize(b))
    shared = len(set_a & set_b)
    return shared / max(1, min(len(set_a), len(set_b)))


def summarize(pages: list[dict], title: str = "", stopwords: frozenset[str] | set[str] = frozenset(), max_sentences: int = 4) -> str | None:
    """Resumen extractivo: elige las frases cuyas palabras más se repiten en el arranque del libro
    (con un empujón a las que nombran el título), sin repetir ideas, y las deja en su orden original."""
    body = [p for p in pages if len(p["texto"]) >= 700 and not NOT_BODY.search(fold(p["texto"])[:4000])][:10]
    if not body:
        return None

    sentences = [
        sentence
        for page in body
        for paragraph in re.split(r"\n{2,}", page["texto"])
        for sentence in split_sentences(flatten(paragraph))
        if is_usable_sentence(sentence)
    ]
    if len(sentences) < 3:
        return None

    frequency: dict[str, int] = {}
    for word in tokenize(" ".join(p["texto"] for p in body)):
        if len(word) < 4 or word in stopwords:
            continue
        frequency[word] = frequency.get(word, 0) + 1
    title_words = set(tokenize(title))

    scored = []
    for index, sentence in enumerate(sentences):
        words = [w for w in tokenize(sentence) if len(w) >= 4 and w not in stopwords]
        base = sum(frequency.get(w, 0) + (4 if w in title_words else 0) for w in words)
        # Se divide por la raíz de la longitud: no se premia solo a las frases largas.
        score = base / sqrt(max(len(words), 1)) + max(0.0, 3 - index * 0.1)
        scored.append((index, sentence, score))

    chosen: list[tuple[int, str, float]] = []
    for candidate in sorted(scored, key=lambda item: item[2], reverse=True):
        if len(chosen) >= max_sentences:
            break
        if all(_overlap(candidate[1], other[1]) < 0.5 for other in chosen):
            chosen.append(candidate)
    summary = " ".join(sentence for _, sentence, _ in sorted(chosen, key=lambda item: item[0]))
    return truncate(summary) if len(summary) >= MIN_BLURB else None


def build_synopsis(
    description: str | None,
    blurb_pages: list[dict],
    body_pages: list[dict],
    title: str = "",
    stopwords: frozenset[str] | set[str] = frozenset(),
) -> dict | None:
    """Sinopsis con el primer método que dé resultado: `{"texto", "origen"}` con origen
    `metadatos`, `libro` o `resumen`; `None` si ninguno sirve."""
    from_metadata = flatten(description) if description else ""
    if looks_like_prose(from_metadata):
        return {"texto": truncate(from_metadata), "origen": "metadatos"}

    blurb = find_blurb(blurb_pages)
    if blurb:
        return {"texto": blurb, "origen": "libro"}

    summary = summarize(body_pages, title, stopwords)
    return {"texto": summary, "origen": "resumen"} if summary else None
