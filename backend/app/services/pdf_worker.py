"""Funciones que se ejecutan **dentro de los procesos del pool** (ver `pdf_text.py`).

Este módulo se importa en cada proceso trabajador, así que importa solo lo imprescindible.
Las funciones devuelven datos simples (diccionarios) y nunca lanzan: un error viaja como
`{"error": {...}}` porque las excepciones propias no se pueden enviar entre procesos.

La lectura usa los *bloques* de MuPDF: cada bloque es un párrafo y se separan con una línea
en blanco. Es la variante más rápida y conserva los párrafos (ver scripts/bench_extractors.py
y docs/adr/0007-backend-python.md).
"""

from __future__ import annotations

import re
import unicodedata

import pymupdf

_TRAILING_BLANKS = re.compile(r"[ \t]+$", re.MULTILINE)
_EDGE_NEWLINES = re.compile(r"^\n+|\n+$")

#: Sin ligaduras: "fi" sale como dos letras y no como un único carácter U+FB01.
_TEXT_FLAGS = pymupdf.TEXTFLAGS_TEXT & ~pymupdf.TEXT_PRESERVE_LIGATURES


def error(status: int, code: str, message: str) -> dict:
    return {"error": {"status": status, "code": code, "message": message}}


def normalize_text(value: str) -> str:
    """NFC, sin nulos ni espacios al final de cada línea y sin saltos de línea en los extremos."""
    text = unicodedata.normalize("NFC", value.replace("\0", ""))
    return _EDGE_NEWLINES.sub("", _TRAILING_BLANKS.sub("", text))


def page_text(page: "pymupdf.Page") -> str:
    """Texto de una página: bloques (párrafos) separados por una línea en blanco."""
    parts = []
    for block in page.get_text("blocks", flags=_TEXT_FLAGS):
        if block[6] == 0:  # 0 = texto; 1 = imagen
            text = block[4].strip("\n")
            if text.strip():
                parts.append(text)
    return normalize_text("\n\n".join(parts))


def open_document(data: bytes):
    """Abre el PDF. Devuelve `(documento, None)` o `(None, error)`."""
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:  # noqa: BLE001 — cualquier fallo al abrir es "PDF dañado"
        return None, error(422, "CORRUPT_PDF", "El PDF está dañado o no se puede leer.")
    if doc.needs_pass:
        doc.close()
        return None, error(422, "PDF_ENCRYPTED", "El PDF está protegido con contraseña.")
    try:
        if doc.page_count < 1:
            raise ValueError("sin páginas")
    except Exception:  # noqa: BLE001
        doc.close()
        return None, error(422, "CORRUPT_PDF", "El PDF está dañado o no se puede leer.")
    return doc, None


def _extract(doc, start: int, end: int, max_bytes: int) -> dict:
    """Páginas `start..end` (base 1, ambos incluidos). Corta si el texto pasa de `max_bytes`."""
    pages = []
    total_bytes = 0
    try:
        for number in range(start, end + 1):
            text = page_text(doc[number - 1])
            total_bytes += len(text.encode("utf-8"))
            if total_bytes > max_bytes:
                return error(
                    422,
                    "CONTENT_TOO_LARGE",
                    "El texto extraído es demasiado grande para guardarse en un solo libro.",
                )
            pages.append((number, text))
    except Exception:  # noqa: BLE001
        return error(422, "CORRUPT_PDF", "El PDF está dañado o no se puede leer.")
    return {"pages": pages}


def probe_or_extract(data: bytes, max_pages: int, parallel_min_pages: int, max_bytes: int) -> dict:
    """Primer paso de una carga: abre el PDF y cuenta las páginas.

    Si el PDF es pequeño lo lee completo en esta misma llamada (un solo viaje al pool) y
    devuelve `{"total", "pages"}`; si es grande devuelve solo `{"total"}` para que se reparta.
    """
    doc, err = open_document(data)
    if err:
        return err
    try:
        total = doc.page_count
        if total > max_pages:
            return error(
                422,
                "TOO_MANY_PAGES",
                f"El PDF tiene {total} páginas; el máximo permitido es {max_pages}.",
            )
        if total >= parallel_min_pages:
            return {"total": total}
        result = _extract(doc, 1, total, max_bytes)
        return {"total": total, **result}
    finally:
        doc.close()


def extract_range(data: bytes, start: int, end: int, max_bytes: int) -> dict:
    """Lee las páginas `start..end` de un PDF grande (una parte del reparto entre procesos)."""
    doc, err = open_document(data)
    if err:
        return err
    try:
        return _extract(doc, start, end, max_bytes)
    finally:
        doc.close()


def extract_range_shared(shm_name: str, size: int, start: int, end: int, max_bytes: int) -> dict:
    """Como `extract_range`, pero el PDF está en memoria compartida: no se copia ni se envía por
    la tubería entre procesos (MuPDF lo abre directamente desde el buffer compartido)."""
    from multiprocessing import shared_memory

    try:
        shm = shared_memory.SharedMemory(name=shm_name)
    except Exception:  # noqa: BLE001
        return error(500, "STORAGE_ERROR", "No se pudo leer el PDF en memoria compartida.")
    view = shm.buf[:size]
    try:
        doc, err = open_document(view)
        if err:
            return err
        try:
            return _extract(doc, start, end, max_bytes)
        finally:
            doc.close()
    finally:
        # El buffer debe soltarse antes de cerrar la memoria compartida.
        view.release()
        shm.close()


def analyze(data: bytes) -> dict:
    """Analiza un PDF para proponer los datos del libro (ver `book_analyzer.py`)."""
    from .book_analyzer import analyze_document

    doc, err = open_document(data)
    if err:
        return err
    try:
        return {"data": analyze_document(doc)}
    except Exception:  # noqa: BLE001
        return error(422, "CORRUPT_PDF", "El PDF está dañado o no se puede leer.")
    finally:
        doc.close()


def init_worker() -> None:
    """Se ejecuta al arrancar cada proceso del pool: si el servidor muere de golpe (por ejemplo
    se cierra a la fuerza) el proceso trabajador se apaga solo en vez de quedar huérfano."""
    import multiprocessing
    import os
    import threading
    import time

    parent = multiprocessing.parent_process()
    if parent is None:
        return

    def watch() -> None:
        while parent.is_alive():
            time.sleep(2)
        os._exit(0)

    threading.Thread(target=watch, daemon=True).start()


def warm_up() -> bool:
    """No hace nada: sirve para que el pool arranque los procesos al iniciar el servidor."""
    return True
