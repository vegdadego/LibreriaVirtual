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


def parse_list(value: Any) -> list[str]:
    """Lista de textos desde un arreglo, un JSON de arreglo o una cadena separada por comas
    (sin vacíos ni repetidos, en orden)."""
    if value is None:
        return []
    items: Any = value
    if isinstance(items, str):
        stripped = items.strip()
        if stripped.startswith("["):
            try:
                items = json.loads(stripped)
            except ValueError:
                items = stripped.split(",")
        else:
            items = stripped.split(",")
    if not isinstance(items, list):
        items = [items]
    clean = [str(item).strip() for item in items]
    return list(dict.fromkeys(item for item in clean if item))


def to_object_id(value: Any, label: str = "libro") -> ObjectId:
    """Convierte a ObjectId o lanza `INVALID_ID` (400)."""
    text = str(value)
    if not re.fullmatch(r"[0-9a-fA-F]{24}", text):
        raise AppError(400, "INVALID_ID", f"Identificador de {label} inválido.")
    return ObjectId(text)
