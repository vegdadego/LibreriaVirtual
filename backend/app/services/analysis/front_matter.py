"""Detectores que leen la página de créditos (primeras y últimas páginas de un libro):
edición, fecha, editorial, autores y saga.

Son reglas sobre texto: si el libro no escribe el dato de una forma reconocible, no se inventa nada.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

import regex as re

from .text_utils import MONTHS, fold, parse_number_word

ORDINALS = "primera|segunda|tercera|cuarta|quinta|sexta|septima|octava|novena|decima|undecima|duodecima|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth"
MAX_EDITION = 60

_EDITION_ORDINAL = re.compile(rf"\b({ORDINALS})\s+(?:edicion|edition)\b")
_EDITION_NUMBER = re.compile(r"\b(\d{1,2})\s*\.?\s*(?:a|o|er|ra|da|ta|st|nd|rd|th)?\s*\.?\s*(?:edicion|edition)\b")
_EDITION_LABEL = re.compile(r"\b(?:edicion|edition)\s*(?:n(?:o|um|umero)?\.?\s*)?[:#]?\s*(\d{1,2})\b(?!\s*[/.-]\s*\d)")


def detect_edition(text: str) -> int | None:
    """Número de edición ("Segunda edición", "3.ª edición", "4th edition", "Edición 5").
    Si el texto menciona varias (historial de ediciones) se toma la mayor."""
    folded = fold(text)
    found: list[int | None] = []
    found += [parse_number_word(m.group(1)) for m in _EDITION_ORDINAL.finditer(folded)]
    found += [int(m.group(1)) for m in _EDITION_NUMBER.finditer(folded)]
    found += [int(m.group(1)) for m in _EDITION_LABEL.finditer(folded)]
    valid = [n for n in found if isinstance(n, int) and 1 <= n <= MAX_EDITION]
    return max(valid) if valid else None


MONTH_NAMES = "|".join(MONTHS)
#: Palabras que indican que una fecha cercana es de publicación o impresión.
DATE_LABEL = re.compile(r"(edicion|edition|publicad|publicacion|published|publication|copyright|impres|printed|printing|primera vez|first)")
LABEL_WINDOW = 90

_MONTH_PATTERNS = [
    # "3 de marzo de 2015", "marzo de 2015", "marzo 2015"
    (re.compile(rf"(?:\b(\d{{1,2}})\s+(?:de\s+)?)?\b({MONTH_NAMES})\s+(?:de\s+|del\s+|,\s*)?(\d{{4}})\b"), lambda m: (m.group(3), m.group(2), m.group(1))),
    # "May 3, 1999", "May 1999"
    (re.compile(rf"\b({MONTH_NAMES})\s+(?:(\d{{1,2}})(?:st|nd|rd|th)?,?\s+)?(\d{{4}})\b"), lambda m: (m.group(3), m.group(1), m.group(2))),
    # "3 May 1999"
    (re.compile(rf"\b(\d{{1,2}})\s+({MONTH_NAMES})\s+(\d{{4}})\b"), lambda m: (m.group(3), m.group(2), m.group(1))),
]
_LABELLED_YEAR = re.compile(r"(?:edicion|edition|publicad[oa]|publicacion|published|publication|impres[oa]|printed)[^.\n]{0,50}?\b(1\d{3}|20\d{2})\b")
_COPYRIGHT_YEARS = re.compile(r"(?:©|\(c\)|copyright)\s*(?:by\s+)?((?:\d{4}\s*[,\-–/]?\s*)+)")


def _naive_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def detect_publication_date(text: str, *, prefer_latest: bool = False, today: datetime | None = None) -> dict | None:
    """Fecha de publicación a partir de frases como "Primera edición: marzo de 2015",
    "First published May 3, 1999" o "© 2008".

    Una fecha con mes solo cuenta si va junto a una palabra como "edición", "publicado" o
    "impreso". Con varias candidatas gana la de más fiabilidad (mes y etiqueta > año con
    etiqueta > año de ©) y, entre iguales, la más antigua, o la más reciente con `prefer_latest`
    (libro de una edición posterior a la primera).

    Devuelve `{"fecha": "AAAA-MM-DD", "precision": "dia"|"mes"|"anio"}` o `None`.
    """
    folded = fold(text)
    now = _naive_utc(today)
    candidates: list[dict] = []

    def add(year: int, month: int | None, day: int | None, priority: int, precision: str) -> None:
        if year < 1000 or year > now.year:
            return
        try:
            value = date(year, month or 1, day or 1)
        except ValueError:
            return
        if datetime(value.year, value.month, value.day) > now:
            return
        candidates.append({"date": value, "priority": priority, "precision": precision})

    for pattern, pick in _MONTH_PATTERNS:
        for match in pattern.finditer(folded):
            context = folded[max(0, match.start() - LABEL_WINDOW) : match.start()]
            if not DATE_LABEL.search(context):
                continue
            year, month, day = pick(match)
            add(int(year), MONTHS[month], int(day) if day else None, 3, "dia" if day else "mes")

    for match in _LABELLED_YEAR.finditer(folded):
        add(int(match.group(1)), None, None, 2, "anio")

    for match in _COPYRIGHT_YEARS.finditer(folded):
        years = [int(y) for y in re.findall(r"\d{4}", match.group(1))]
        add(min(years), None, None, 1, "anio")

    if not candidates:
        return None
    top = max(c["priority"] for c in candidates)
    best = sorted(
        (c for c in candidates if c["priority"] == top),
        key=lambda c: c["date"],
        reverse=prefer_latest,
    )[0]
    return {"fecha": best["date"].isoformat(), "precision": best["precision"]}


#: Editoriales frecuentes con el nombre con que se guardan. Las de una sola palabra se buscan
#: respetando mayúsculas para no confundirlas con palabras comunes.
KNOWN_PUBLISHERS = [
    "Penguin Random House", "Random House", "Penguin Books", "Penguin Clásicos", "Editorial Planeta", "Grupo Planeta", "Alfaguara",
    "Anagrama", "Tusquets", "Seix Barral", "Booket", "Debolsillo", "Plaza & Janés", "Grijalbo", "Editorial Lumen", "Ediciones B",
    "Minotauro", "Siruela", "Salamandra", "Roca Editorial", "Umbriel", "Edhasa", "Impedimenta", "Nórdica Libros", "Blackie Books",
    "Alianza Editorial", "Editorial Gredos", "Ediciones Cátedra", "Fondo de Cultura Económica", "Siglo XXI", "Paidós",
    "Editorial Ariel", "Editorial Crítica", "Akal", "Editorial Anaya", "Ediciones SM", "Santillana", "Editorial Espasa", "Espasa",
    "Editorial Sudamericana", "Emecé", "Ediciones Destino", "Editorial Juventud", "Ediciones Urano", "Martínez Roca", "Montena",
    "HarperCollins", "Harper Collins", "Simon & Schuster", "Hachette", "Macmillan", "Tor Books", "Bloomsbury", "Vintage Books",
    "Oxford University Press", "Cambridge University Press", "Scholastic", "Houghton Mifflin", "Doubleday", "Knopf", "Orbit Books",
    "Gollancz", "Gallimard", "Flammarion", "Einaudi", "Mondadori", "Feltrinelli", "Suhrkamp", "Companhia das Letras", "Editora Record",
]

_STRUCTURED_PUBLISHER = [
    # "Editorial Siruela", "Ediciones del Viento": la palabra forma parte del nombre.
    re.compile(r"\b((?:Editorial|Ediciones|Edicions|Editora|Editions|Edizioni)\s+[A-ZÁÉÍÓÚÑÜ][\p{L}&'’.\- ]{1,40})"),
    # "Publicado por Alfaguara", "Published by Tor Books", "Edita: X".
    re.compile(r"(?i:publicado por|editado por|published by|publisher|edita|editor)\s*[:-]?\s+([A-ZÁÉÍÓÚÑÜ][\p{L}&'’.\- ]{1,40})"),
]
_PUBLISHER_CUT = re.compile(r"[,;|©(\n]|\d|\bISBN\b|\bS\.?\s?[AL]\b|\bLtd\b|\bInc\b|\bTodos\b|\bAll\b")
_GENERIC_PUBLISHER = re.compile(r"^(Editorial|Ediciones|Editora|Editions)$", re.I)


def _clean_publisher(raw: str) -> str:
    """Corta en la puntuación o en datos que siguen al nombre (ISBN, años, sociedad anónima)
    y lo limita a cinco palabras."""
    name = _PUBLISHER_CUT.split(raw)[0]
    name = re.sub(r"[.\s]+$", "", name)
    return " ".join(name.split()[:5]).strip()


def detect_publisher(text: str) -> str | None:
    """Editorial: busca las conocidas y las frases "Editorial X", "Ediciones X" o
    "Publicado por X". Gana la que aparece antes en el texto."""
    candidates: list[tuple[int, str]] = []

    folded = fold(text)
    for name in KNOWN_PUBLISHERS:
        if re.search(r"[\s&]", name):
            found = re.search(rf"\b{re.escape(fold(name))}\b", folded)
        else:
            found = re.search(rf"\b{re.escape(name)}\b", text)
        if found:
            candidates.append((found.start(), name))
    for pattern in _STRUCTURED_PUBLISHER:
        match = pattern.search(text)
        if not match:
            continue
        name = _clean_publisher(match.group(1))
        if len(name) >= 3 and not _GENERIC_PUBLISHER.match(name):
            candidates.append((match.start(), name))
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item[0])[0][1]


#: Valores que los programas ponen como autor y que no son una persona.
JUNK_AUTHOR = re.compile(
    r"^(admin|administrador|administrator|user|usuario|windows user|owner|propietario|pc|unknown|desconocido|anonymous|anonimo|anónimo|author|autor|none|n/a|microsoft|adobe|calibre|libreoffice|openoffice|word|ocr|scanner|escaner|escáner|scan|root|default|guest|invitado)\b",
    re.I,
)
#: Palabras que delatan que un "©" va seguido de una empresa y no de una persona.
COMPANY_WORDS = re.compile(
    r"\b(editorial|ediciones|publishing|publishers|press|books|libros|s\.?a\.?|s\.?l\.?|inc|ltd|llc|gmbh|penguin|random|house|planeta|group|grupo|reserved|reservados|derechos|rights|todos|all|licensed|licencia)\b",
    re.I,
)
_AUTHOR_SPLIT = re.compile(r"\s*(?:;|&|\n|\s/\s|\s+y\s+|\s+and\s+|\s+e\s+)\s*", re.I)
_AUTHOR_EDGES = re.compile(r"^[^\p{L}]+|[^\p{L}.]+$")
_FILE_NAME = re.compile(r"\.(docx?|pdf|indd|qxd|pub)$", re.I)


def split_authors(raw: str | None) -> list[str]:
    """Separa y limpia una lista de autores escrita en una sola cadena ("A; B", "A y B", "A & B").
    Descarta valores que no parecen una persona. Devuelve hasta 6 nombres sin repetir."""
    names: list[str] = []
    for part in _AUTHOR_SPLIT.split(str(raw or "")):
        # Una sola coma separa dos nombres completos ("Ana Pérez, Luis Gómez"), pero no "Pérez, Ana".
        pieces = [piece.strip() for piece in part.split(",")]
        if len(pieces) == 2 and all(len(piece.split()) >= 2 for piece in pieces):
            names.extend(pieces)
        else:
            names.append(part)
    cleaned = [_AUTHOR_EDGES.sub("", name).strip() for name in names]
    valid = [
        name
        for name in cleaned
        if 3 <= len(name) <= 80 and not JUNK_AUTHOR.match(name) and not re.search(r"[@\d]", name) and not _FILE_NAME.search(name)
    ]
    return list(dict.fromkeys(valid))[:6]


_PARTICLES = {"de", "del", "la", "las", "los", "van", "von", "da", "di", "le", "y", "bin", "al", "el"}
_CAPITALIZED = re.compile(r"^\p{Lu}[\p{L}.'’-]*$")


def _looks_like_person_name(name: str) -> bool:
    """Un nombre de persona: de 2 a 5 palabras, todas con mayúscula inicial (se admiten
    "de", "del", "la", "van", "von" como partículas)."""
    words = name.split()
    if len(words) < 2 or len(words) > 5:
        return False
    return all(word.lower() in _PARTICLES or _CAPITALIZED.match(word) for word in words)


_AUTHOR_LABEL = re.compile(
    r"^\s*(?:por|by|autor(?:a|es|as)?|escrito por|written by|author|authors)\s*[:-]?\s+(.{3,90})$", re.I | re.M
)
_COPYRIGHT_HOLDER = re.compile(
    r"(?i:©|\(c\)|copyright)\s*(?i:by\s+)?(?:\d{4}\s*[,\-–/]?\s*)*(?i:by\s+)?(\p{Lu}[\p{L}.'’ -]{3,60})"
)
_SENTENCE_END = re.compile(r"(?<=\p{L}{3})\.\s")


def detect_authors_from_text(text: str) -> list[str]:
    """Autores escritos en las primeras páginas: líneas como "Por Ana Pérez", "Autor: Ana Pérez" o
    "by Jane Doe" y, si no hay otra pista, el titular del © de la página de créditos."""
    for match in _AUTHOR_LABEL.finditer(text):
        names = [n for n in split_authors(match.group(1)) if _looks_like_person_name(n)]
        if names:
            return names

    for match in _COPYRIGHT_HOLDER.finditer(text):
        # El titular acaba en el primer punto que cierra una palabra ("Sanderson. Todos los
        # derechos..."); el punto de una inicial ("J. R. R. Tolkien") no cuenta.
        holder = _SENTENCE_END.split(match.group(1))[0].strip()
        if COMPANY_WORDS.search(holder):
            continue
        names = [n for n in split_authors(holder) if _looks_like_person_name(n)]
        if names:
            return names
    return []


SAGA_KINDS = "saga|serie|series|trilog[ií]a|trilogy|tetralog[ií]a|tetralogy|ciclo|cycle|cr[oó]nicas|chronicles"

_SAGA_NAME_CUT = re.compile(r"\s+(?:es|is|was|fue|por|by|escrit[ao]|written|publicad[ao]|published)\s", re.I)
_SAGA_EDGES = re.compile(r"^[\s\"'«“‘:–-]+|[\s\"'»”’:–.,;-]+$")


def _clean_saga_name(raw: str) -> str:
    """Nombre de saga sin comillas ni signos en los extremos y cortado donde empieza una frase."""
    return _SAGA_EDGES.sub("", _SAGA_NAME_CUT.split(raw)[0]).strip()


_SAGA_IN_PARENS = re.compile(
    r"\(([^()#\n]{2,80}?)\s*(?:#|,?\s*(?:libro|book|vol\.?|volumen|tomo|n\.?\s*[ºo°]?|no\.?)\s*)(\d{1,3})\)", re.I
)
_SAGA_BOOK_OF = re.compile(
    rf"\b(?:libro|tomo|volumen|book|volume|vol\.)\s+(\d{{1,3}}|[ivx]{{1,4}}|[a-záéíóúñ]{{3,10}})\s+(?:de|of)\s+((?:la|el|los|las|the)\s+)?(?:({SAGA_KINDS})\s+(?:de\s+(?:la\s+|el\s+)?|of\s+(?:the\s+)?)?)?(\S[^\n.,;:«»\"“”]{{2,70}})",
    re.I,
)
_SAGA_LABEL = re.compile(rf"^\s*(?:{SAGA_KINDS})\s*[:–-]\s*(.{{3,80}})$", re.I | re.M)
_SAGA_TAIL = re.compile(r"^(.*?)(?:\s*[#,–-]\s*(?:libro|book|vol\.?|volumen|tomo)?\s*(\d{1,3}))?\s*$", re.I)


def detect_saga(text: str) -> dict | None:
    """Saga y posición dentro de ella ("Libro 2 de la saga Crónicas del Rey", "Book Three of
    The Stormlight Archive", "(Nacidos de la bruma #1)", "Saga: X"). Devuelve
    `{"saga": nombre, "numero": n|None}` o `None`."""
    # "Título (Nombre de la saga #3)" o "(Nombre, Libro 3)".
    in_parens = _SAGA_IN_PARENS.search(text)
    if in_parens:
        return {"saga": _clean_saga_name(in_parens.group(1)), "numero": int(in_parens.group(2))}

    # "Libro 2 de la saga X", "Book Two of The X".
    for match in _SAGA_BOOK_OF.finditer(text):
        raw_number, article, kind, raw_name = match.groups()
        number = parse_number_word(raw_number)
        # Sin la palabra "saga/serie…" ni artículo ("Libro 1 de poemas") es demasiado ambiguo.
        if not number or not (kind or article) or not re.match(r"\p{Lu}", raw_name):
            continue
        saga = _clean_saga_name(raw_name if kind else f"{article}{raw_name}")
        if len(saga) >= 3:
            return {"saga": saga, "numero": number}

    # Línea "Saga: X", "Serie: X #2", "Trilogía: X".
    labelled = _SAGA_LABEL.search(text)
    if labelled:
        tail = _SAGA_TAIL.match(labelled.group(1))
        saga = _clean_saga_name(tail.group(1))
        if len(saga) >= 3:
            return {"saga": saga, "numero": int(tail.group(2)) if tail.group(2) else None}
    return None


_SAGA_IN_TITLE = re.compile(
    r"\s*\([^()#\n]{2,80}?\s*(?:#|,?\s*(?:libro|book|vol\.?|volumen|tomo|n\.?\s*[ºo°]?|no\.?)\s*)\d{1,3}\)\s*$", re.I
)


def strip_saga_from_title(title: str) -> str:
    """Quita del título un paréntesis de saga ("El Imperio Final (Nacidos de la bruma #1)")."""
    return _SAGA_IN_TITLE.sub("", title).strip()
