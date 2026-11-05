"""Utilidades de texto y de identificadores compartidas por varios módulos."""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any

from bson import ObjectId

from .errors import AppError


def escape_regex(value: Any) -> str:
    """Escapa los metacaracteres para usar un texto del usuario dentro de una expresión regular."""
    return re.escape(str(value))


def normalize_text(value: Any) -> str:
    """Texto extraído de un PDF: NFC, sin nulos y sin espacios al final de cada línea
    (conserva saltos de línea y de párrafo)."""
    text = str(value).replace("\0", "")
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE)
    return re.sub(r"^\n+|\n+$", "", text)


def fold_text(value: Any) -> str:
    """Forma comparable: sin acentos y en minúsculas."""
    decomposed = unicodedata.normalize("NFD", str(value))
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").lower().strip()


#: Caracteres de control que no son texto (nulos, escapes...). Se conservan el tabulador y el salto de línea.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_LINE_BREAKS = re.compile(r"\s*[\n\t]\s*")
_LIST_SEPARATORS = re.compile(r"[;\n]")


def clean_text(value: Any, *, multiline: bool = False) -> str:
    """Texto escrito por una persona (título, autor, sinopsis...) listo para guardarse.

    Permite cualquier carácter imprimible: acentos, ñ, signos como ¿ ¡ « » & # + / ' ", símbolos,
    otros alfabetos y emojis. Solo se normaliza a NFC (así «é» se guarda igual venga como una letra
    o como dos), se quitan los caracteres de control y los sustitutos sueltos, que no se pueden
    codificar, y se recortan los extremos. Sin `multiline` los saltos de línea y tabuladores
    pasan a un espacio (un título es de una sola línea).
    """
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    text = text.encode("utf-8", "replace").decode("utf-8")
    text = _CONTROL_CHARS.sub("", unicodedata.normalize("NFC", text))
    if not multiline:
        text = _LINE_BREAKS.sub(" ", text)
    return text.strip()


def _split_list_text(text: str) -> list[str]:
    """Separa una cadena en elementos: por `;` o salto de línea si los hay, si no por comas."""
    return _LIST_SEPARATORS.split(text) if _LIST_SEPARATORS.search(text) else text.split(",")


def parse_list(value: Any) -> list[str]:
    """Lista de textos desde un arreglo, un JSON de arreglo o una cadena (sin vacíos ni repetidos, en orden).

    En una cadena los elementos se separan por **punto y coma o salto de línea** si los hay (así
    «García Márquez, Gabriel; Tolkien, J. R. R.» son dos autores con coma dentro) y, si no, por comas.
    """
    if value is None:
        return []
    items: Any = value
    if isinstance(items, str):
        stripped = items.strip()
        if stripped.startswith("["):
            try:
                items = json.loads(stripped)
            except ValueError:
                items = _split_list_text(stripped)
        else:
            items = _split_list_text(stripped)
    if not isinstance(items, list):
        items = [items]
    clean = [clean_text(item) for item in items]
    return list(dict.fromkeys(item for item in clean if item))


def to_object_id(value: Any, label: str = "libro") -> ObjectId:
    """Convierte a ObjectId o lanza `INVALID_ID` (400)."""
    text = str(value)
    if not re.fullmatch(r"[0-9a-fA-F]{24}", text):
        raise AppError(400, "INVALID_ID", f"Identificador de {label} inválido.")
    return ObjectId(text)
