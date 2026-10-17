"""Utilidades de texto compartidas por los detectores de `services/analysis`."""

from __future__ import annotations

import unicodedata
from typing import Any

import regex as re

_DIACRITIC = re.compile(r"\p{Diacritic}")
_WORD = re.compile(r"\p{L}+")


def fold(value: Any) -> str:
    """Forma comparable de un texto: minúsculas, sin acentos y con las formas de compatibilidad
    resueltas (`ª` → `a`, `º` → `o`, ligaduras). Solo sirve para buscar; no conserva las
    posiciones exactas del original."""
    text = unicodedata.normalize("NFKD", "" if value is None else str(value))
    return _DIACRITIC.sub("", text).lower()


def tokenize(text: str) -> list[str]:
    """Palabras de un texto (ya plegadas con `fold`)."""
    return _WORD.findall(fold(text))


def flatten(text: str) -> str:
    """Une las líneas de un párrafo en una sola y colapsa los espacios."""
    text = re.sub(r"\s*\n\s*", " ", str(text))
    return re.sub(r"[ \t]{2,}", " ", text).strip()


#: Meses en español e inglés (sin acentos), con su número.
MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}

WORD_NUMBERS = {
    "uno": 1, "una": 1, "primero": 1, "primera": 1, "primer": 1, "one": 1, "first": 1,
    "dos": 2, "segundo": 2, "segunda": 2, "two": 2, "second": 2,
    "tres": 3, "tercero": 3, "tercera": 3, "tercer": 3, "three": 3, "third": 3,
    "cuatro": 4, "cuarto": 4, "cuarta": 4, "four": 4, "fourth": 4,
    "cinco": 5, "quinto": 5, "quinta": 5, "five": 5, "fifth": 5,
    "seis": 6, "sexto": 6, "sexta": 6, "six": 6, "sixth": 6,
    "siete": 7, "septimo": 7, "septima": 7, "seven": 7, "seventh": 7,
    "ocho": 8, "octavo": 8, "octava": 8, "eight": 8, "eighth": 8,
    "nueve": 9, "noveno": 9, "novena": 9, "nine": 9, "ninth": 9,
    "diez": 10, "decimo": 10, "decima": 10, "ten": 10, "tenth": 10,
    "once": 11, "undecimo": 11, "undecima": 11, "eleven": 11,
    "doce": 12, "duodecimo": 12, "duodecima": 12, "twelve": 12,
}

_ROMAN = re.compile(r"^(?=[ivx])(x{0,2})(ix|iv|v?i{0,3})$")
_ROMAN_VALUES = {"i": 1, "v": 5, "x": 10}


def parse_number_word(raw: str) -> int | None:
    """Interpreta un número escrito como cifra ("3"), palabra ("tercero", "two") o numeral
    romano ("IV"). Devuelve un entero de 1 a 99, o `None` si no se reconoce."""
    word = re.sub(r"[^a-z0-9]", "", fold(raw))
    if not word:
        return None
    if re.fullmatch(r"\d{1,2}", word):
        number = int(word)
        return number if number >= 1 else None
    if word in WORD_NUMBERS:
        return WORD_NUMBERS[word]
    if _ROMAN.match(word):
        total = 0
        for index, char in enumerate(word):
            value = _ROMAN_VALUES[char]
            following = _ROMAN_VALUES.get(word[index + 1], 0) if index + 1 < len(word) else 0
            total += -value if value < following else value
        return total if total >= 1 else None
    return None
