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


#: Glifos vacíos (cuadros, formas, carácter de reemplazo, uso privado) y controles salvo `\n` y `\t`.
_JUNK_CHARS = re.compile("[�■-◿-\x00-\x08\x0b-\x1f\x7f]")
#: Puntos guía de los índices ("Capítulo 1 ........ 5"): se acortan, solo importa que haya guía.
_LEADER_DOTS = re.compile(r"\.{6,}")
#: Símbolos casi inexistentes en prosa: señal de basura de OCR (`J^OiA`, `\ ;ne> \(r>`).
_ODD_SYMBOLS = frozenset("\\^~´`¨¬·¦¤")
_LETTER_RUN = re.compile(r"[^\W\d_]{4,}")
_NOISE_MAX_LEN = 60
_NOISE_MIN_RATIO = 0.15


def _is_ocr_noise(line: str) -> bool:
    """`True` si la línea es corta, sin ninguna palabra de 4+ letras y con símbolos raros (basura de OCR)."""
    compact = "".join(line.split())
    if not compact or len(compact) > _NOISE_MAX_LEN or _LETTER_RUN.search(compact):
        return False
    odd = sum(1 for char in compact if char in _ODD_SYMBOLS)
    return odd / len(compact) >= _NOISE_MIN_RATIO


def clean_ocr_noise(text: str) -> str:
    """Quita glifos vacíos y líneas que son basura de OCR; acorta las tiras de puntos guía.

    Es conservador a propósito: una línea solo se descarta si es corta, no tiene palabras de
    cuatro letras o más y lleva símbolos que casi no existen en prosa. No corrige letras mal
    leídas (eso requeriría OCR propio, ver docs/adr/0008).
    """
    text = _LEADER_DOTS.sub(".....", _JUNK_CHARS.sub("", text))
    return "\n".join(line for line in text.split("\n") if not _is_ocr_noise(line))


def normalize_text(value: str) -> str:
    """NFC, sin nulos ni espacios al final de cada línea y sin saltos de línea en los extremos."""
    text = unicodedata.normalize("NFC", value.replace("\0", ""))
    return _EDGE_NEWLINES.sub("", _TRAILING_BLANKS.sub("", text))


#: Una página con menos dibujos vectoriales (líneas y rectángulos) que estos no tiene tablas con bordes;
#: así `find_tables`, que es lo más lento de la lectura, solo se ejecuta donde puede haber una tabla.
_MIN_TABLE_DRAWINGS = 8
#: Margen (en puntos) con el que un bloque de texto cuenta como parte de una tabla.
_TABLE_MARGIN = 2
#: Una regla (línea o rectángulo muy delgado) mide a lo sumo este grosor y al menos este largo, en puntos.
_RULE_THICKNESS = 1.5
_RULE_MIN_LENGTH = 20
#: Una página con menos dibujos no tiene figuras de dibujo (evita agrupar dibujos en páginas de solo texto).
_MIN_FIGURE_DRAWINGS = 6


def _clean_table(rows: list[list]) -> list[list[str]]:
    """Celdas como texto de una línea, sin filas ni columnas vacías. Lista vacía si no parece una tabla
    de verdad (menos de 2 filas o 2 columnas, o casi todas las celdas vacías)."""
    cells = [[" ".join(str(cell or "").split()) for cell in row] for row in rows]
    cells = [row for row in cells if any(row)]
    if len(cells) < 2:
        return []
    width = max(len(row) for row in cells)
    cells = [row + [""] * (width - len(row)) for row in cells]
    keep = [col for col in range(width) if any(row[col] for row in cells)]
    cells = [[row[col] for col in keep] for row in cells]
    filled = sum(1 for row in cells for cell in row if cell)
    if len(keep) < 2 or filled < 4 or filled / (len(cells) * len(keep)) < 0.4:
        return []
    return cells


def _table_region(drawings: list[dict]) -> "pymupdf.Rect | None":
    """Zona de la página donde puede haber tablas, o `None` si no hay. Es filtro y recorte a la vez:
    `find_tables` cuesta unos 60-100 ms por página y casi todo va en analizar cada carácter, así que se
    le pasa solo el recuadro que envuelve las reglas y celdas dibujadas, no la página entera.

    Una tabla con bordes tiene varias reglas horizontales y verticales o varias celdas con recuadro dibujado
    (los rótulos con fondo gris y sin borde, las figuras y los filetes sueltos no cuentan)."""
    if len(drawings) < _MIN_TABLE_DRAWINGS:
        return None
    horizontal = vertical = cells = 0
    grid: list[tuple] = []
    for drawing in drawings:
        x0, y0, x1, y1 = drawing["rect"]
        width, height = x1 - x0, y1 - y0
        if height <= _RULE_THICKNESS and width >= _RULE_MIN_LENGTH:
            horizontal += 1
        elif width <= _RULE_THICKNESS and height >= _RULE_MIN_LENGTH / 2:
            vertical += 1
        elif drawing.get("color") is not None and width >= _RULE_MIN_LENGTH / 2 and height >= _RULE_MIN_LENGTH / 2:
            cells += 1
        else:
            continue
        grid.append((x0, y0, x1, y1))
    if not ((horizontal >= 3 and vertical >= 2) or cells >= 4):
        return None
    return pymupdf.Rect(
        min(g[0] for g in grid) - _TABLE_MARGIN * 2,
        min(g[1] for g in grid) - _TABLE_MARGIN * 2,
        max(g[2] for g in grid) + _TABLE_MARGIN * 2,
        max(g[3] for g in grid) + _TABLE_MARGIN * 2,
    )


def _page_tables(page: "pymupdf.Page", drawings: list[dict]) -> list[tuple["pymupdf.Rect", list[list[str]]]]:
    """Tablas con bordes de la página como `(rectángulo, filas de celdas)`."""
    try:
        region = _table_region(drawings)
        if region is None:
            return []
        found = page.find_tables(clip=region & page.rect).tables
    except Exception:  # noqa: BLE001 — sin tablas el texto se lee igual
        return []
    tables = []
    for table in found:
        try:
            rows = _clean_table(table.extract())
        except Exception:  # noqa: BLE001
            continue
        if rows:
            rect = pymupdf.Rect(table.bbox)
            rect = pymupdf.Rect(rect.x0 - _TABLE_MARGIN, rect.y0 - _TABLE_MARGIN, rect.x1 + _TABLE_MARGIN, rect.y1 + _TABLE_MARGIN)
            tables.append((rect, rows))
    return tables


def table_markdown(rows: list[list[str]]) -> str:
    """Tabla como filas `| a | b |` con una línea `| --- | --- |` tras la primera fila. El lector la
    reconoce y la dibuja como tabla; un `|` dentro de una celda va escapado con una barra invertida."""

    def row(cells: list[str]) -> str:
        return "| " + " | ".join(cell.replace("|", "\\|") for cell in cells) + " |"

    return "\n".join([row(rows[0]), row(["---"] * len(rows[0])), *(row(cells) for cells in rows[1:])])


#: Prefijos de los párrafos con estructura que el lector dibuja aparte (ver `src/utils/pageContent.js`).
MARGIN_PREFIX = "[[margen]] "
TITLE_PREFIX = "[[titulo]] "
SUBTITLE_PREFIX = "[[subtitulo]] "
#: Un bloque con al menos tantos caracteres cuenta como cuerpo de la página al buscar sus márgenes.
_BODY_MIN_CHARS = 150
#: Un rótulo de margen ocupa menos de esta fracción del ancho de la página y queda fuera del cuerpo.
_MARGIN_MAX_WIDTH = 0.3
_MARGIN_GAP = 4
_MARGIN_MAX_CHARS = 90
#: Franja superior e inferior de la página (fracción de su alto) donde van los encabezados y números de página.
_RUNNING_BAND = 0.1
_RUNNING_MAX_CHARS = 80
#: Letra de hasta este tamaño (puntos) puede ser encabezado corrido aunque la página tenga poco cuerpo.
_RUNNING_MAX_SIZE = 12
#: Un texto con letra al menos así de grande respecto al cuerpo es un título; mayor que `_TITLE_RATIO`, de primer nivel.
_HEADING_RATIO = 1.15
_TITLE_RATIO = 1.6
_HEADING_MAX_CHARS = 120
_HEADING_MAX_LINES = 3
_PAGE_NUMBER = re.compile(r"^(?:\d{1,4}|[ivxlcdm]{1,7})$", re.IGNORECASE)
_NUMBER_AT_EDGE = re.compile(r"^\W*\d{1,4}|\d{1,4}\W*$")


def _text_blocks(page: "pymupdf.Page") -> tuple[list[dict], list["pymupdf.Rect"]]:
    """Bloques de texto de la página (recuadro, texto, tamaño de letra dominante y si todo va en negrita)
    y recuadros de sus imágenes."""
    result = []
    # Las imágenes no vienen en `get_text` (sin la opción que copia sus bytes, que sería lento).
    images = [pymupdf.Rect(info["bbox"]) for info in page.get_image_info()]
    for block in page.get_text("dict", flags=_TEXT_FLAGS)["blocks"]:
        if block.get("type") != 0:  # 0 = texto; 1 = imagen
            continue
        lines = []
        sizes: dict[float, int] = {}
        bold = True
        for line in block["lines"]:
            spans = [s for s in line["spans"] if s["text"]]
            lines.append("".join(s["text"] for s in spans))
            for s in spans:
                chars = len(s["text"].strip())
                if chars:
                    sizes[round(s["size"], 1)] = sizes.get(round(s["size"], 1), 0) + chars
                    bold = bold and bool(s["flags"] & 16)
        text = "\n".join(lines)
        if text.strip() and sizes:
            result.append({"bbox": block["bbox"], "text": text, "size": max(sizes, key=sizes.get), "chars": sum(sizes.values()),
                           "bold": bold, "lines": len(lines)})
    return result, images


def _margin_limits(blocks: list[dict]) -> tuple[float, float] | None:
    """Límites `(izquierdo, derecho)` de la columna del cuerpo, o `None` si la página no tiene cuerpo claro."""
    body = [b["bbox"] for b in blocks if b["chars"] >= _BODY_MIN_CHARS]
    if len(body) < 2:
        return None
    return min(b[0] for b in body), max(b[2] for b in body)


def _is_margin_note(block: dict, limits: tuple[float, float] | None, page_width: float) -> bool:
    """Bloque corto y estrecho que queda del todo fuera de la columna del cuerpo (a su izquierda o derecha)."""
    x0, _y0, x1, _y1 = block["bbox"]
    if limits is None or block["chars"] > _MARGIN_MAX_CHARS or x1 - x0 > page_width * _MARGIN_MAX_WIDTH:
        return False
    return x1 <= limits[0] - _MARGIN_GAP or x0 >= limits[1] + _MARGIN_GAP


def _is_running_text(block: dict, body_size: float, page_height: float) -> bool:
    """Encabezado o número de página: texto corto en la franja superior o inferior, con letra de cuerpo o menor,
    que es solo un número (arábigo o romano) o lleva uno en un extremo («Introducción 3», «12 Capítulo 1»)."""
    _x0, y0, _x1, y1 = block["bbox"]
    if y1 > page_height * _RUNNING_BAND and y0 < page_height * (1 - _RUNNING_BAND):
        return False
    text = " ".join(block["text"].split())
    if len(text) > _RUNNING_MAX_CHARS or block["size"] > max(body_size * _HEADING_RATIO, _RUNNING_MAX_SIZE):
        return False
    if _PAGE_NUMBER.match(text):
        return True
    # Con varias líneas solo cuenta si una es el número suelto («74» sobre el título); si no, es un párrafo.
    lines = [line.strip() for line in block["text"].splitlines() if line.strip()]
    if len(lines) > 1 and not any(_PAGE_NUMBER.match(line) for line in lines):
        return False
    return bool(_NUMBER_AT_EDGE.search(text))


def _heading_prefix(block: dict, body_size: float) -> str | None:
    """Prefijo de título si el bloque es un encabezado de sección: letra bastante mayor que la del cuerpo,
    o corto, todo en negrita y sin punto final. `None` si es un párrafo."""
    text = " ".join(block["text"].split())
    if not 3 <= len(text) <= _HEADING_MAX_CHARS or block["lines"] > _HEADING_MAX_LINES or text.startswith("("):
        return None
    ratio = block["size"] / body_size
    if ratio >= _HEADING_RATIO:
        return TITLE_PREFIX if ratio >= _TITLE_RATIO else SUBTITLE_PREFIX
    if block["bold"] and ratio >= 0.95 and len(text) <= 80 and not text.endswith((".", ":", ";", ",")):
        return SUBTITLE_PREFIX
    return None


#: Prefijo del párrafo de una figura: su pie (`[[figura]] Figura 1.2 Partes de...`) o vacío si no tiene.
FIGURE_PREFIX = "[[figura]]"
#: Tamaño mínimo (ancho, alto en puntos) de una imagen o dibujo para contar como figura.
_FIGURE_MIN_SIZE = (80, 50)
#: Un texto de hasta este largo dentro de un dibujo es una etiqueta de la figura; hacen falta al menos tres.
_LABEL_MAX_CHARS = 60
_LABEL_MAX_LINES = 5
_MIN_LABELS = 3
#: Distancia máxima (puntos) entre una figura y su pie.
_CAPTION_GAP = 45
_CAPTION = re.compile(
    r"^(?:Figura|Fig\.|Figure|Gráfico|Gráfica|Ilustración|Imagen)\s+\d+(?:[.\-]\d+)*\.?(?:\s*\n|\s+[A-ZÁÉÍÓÚÑ¿¡\"“(]|\s*$)"
)


def _labels_in_drawings(drawings: list[dict], blocks: list[dict]) -> int:
    """Textos cortos que caen dentro del recuadro de los dibujos de la página (sin contar filetes finos)."""
    rects = [d["rect"] for d in drawings if d["rect"][2] - d["rect"][0] > _RULE_THICKNESS and d["rect"][3] - d["rect"][1] > _RULE_THICKNESS]
    if not rects:
        return 0
    x0, y0 = min(r[0] for r in rects), min(r[1] for r in rects)
    x1, y1 = max(r[2] for r in rects), max(r[3] for r in rects)
    count = 0
    for blk in blocks:
        cx, cy = (blk["bbox"][0] + blk["bbox"][2]) / 2, (blk["bbox"][1] + blk["bbox"][3]) / 2
        if blk["chars"] <= _LABEL_MAX_CHARS and x0 <= cx <= x1 and y0 <= cy <= y1:
            count += 1
    return count


def _cluster_rects(rects: list[tuple], tolerance: float = 3) -> list[list[float]]:
    """Agrupa los recuadros que se tocan (a menos de `tolerance` puntos) y devuelve el recuadro de cada grupo.
    Equivale a `Page.cluster_drawings`, pero con los dibujos que ya se leyeron para las tablas."""
    clusters: list[list[float]] = []
    for x0, y0, x1, y1 in rects:
        box = [x0, y0, x1, y1]
        merged = True
        while merged:
            merged = False
            for other in clusters:
                if other[0] - tolerance <= box[2] and box[0] - tolerance <= other[2] and other[1] - tolerance <= box[3] and box[1] - tolerance <= other[3]:
                    box = [min(box[0], other[0]), min(box[1], other[1]), max(box[2], other[2]), max(box[3], other[3])]
                    clusters.remove(other)
                    merged = True
                    break
        clusters.append(box)
    return clusters


def _figure_regions(
    page: "pymupdf.Page", drawings: list[dict], images: list["pymupdf.Rect"], blocks: list[dict]
) -> list["pymupdf.Rect"]:
    """Recuadros de las figuras de la página: imágenes y dibujos vectoriales de cierto tamaño."""
    min_w, min_h = _FIGURE_MIN_SIZE
    regions = [r for r in images if r.width >= min_w and r.height >= min_h]
    # Solo se agrupan los dibujos si hay un pie de figura o varios textos cortos dentro de ellos.
    has_caption = any(_CAPTION.match(blk["text"].lstrip()) for blk in blocks)
    if len(drawings) >= _MIN_FIGURE_DRAWINGS and (has_caption or _labels_in_drawings(drawings, blocks) >= _MIN_LABELS):
        clusters = _cluster_rects([d["rect"] for d in drawings])
        regions.extend(pymupdf.Rect(c) for c in clusters if c[2] - c[0] >= min_w and c[3] - c[1] >= min_h)
    return regions


def _center(bbox) -> "pymupdf.Point":
    """Centro de un recuadro `(x0, y0, x1, y1)`."""
    return pymupdf.Point((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def _near(rect: "pymupdf.Rect", region: "pymupdf.Rect") -> bool:
    """El recuadro del texto está dentro de la figura o a menos de `_CAPTION_GAP` por encima o por debajo."""
    horizontal = rect.x0 < region.x1 and rect.x1 > region.x0
    return horizontal and rect.y0 < region.y1 + _CAPTION_GAP and rect.y1 > region.y0 - _CAPTION_GAP


def page_text(page: "pymupdf.Page", with_tables: bool = True, structure: bool = True) -> str:
    """Texto de una página: bloques (párrafos) separados por una línea en blanco. Con `with_tables`, las
    tablas con bordes salen como filas `| a | b |` (ver `table_markdown`) en el lugar donde estaban.
    Con `structure`, además: se omiten encabezados corridos y números de página; los títulos salen con el
    prefijo `TITLE_PREFIX`/`SUBTITLE_PREFIX`; y los rótulos del margen con `MARGIN_PREFIX`, justo antes
    del párrafo con el que quedan alineados."""
    drawings = page.get_cdrawings() if with_tables or structure else []
    tables = _page_tables(page, drawings) if with_tables else []
    blocks, images = _text_blocks(page)
    limits = _margin_limits(blocks) if structure else None
    figures = _figure_regions(page, drawings, images, blocks) if structure else []
    captioned: set[int] = set()  # figuras con pie
    labelled: dict[int, int] = {}  # figura -> etiquetas de texto que contiene
    page_width, page_height = page.rect.width, page.rect.height
    sizes: dict[float, int] = {}
    outside = [b for b in blocks if not any(f.contains(_center(b["bbox"])) for f in figures)] or blocks
    for b in outside:  # el tamaño del cuerpo no cuenta el texto de las figuras
        sizes[b["size"]] = sizes.get(b["size"], 0) + b["chars"]
    body_size = max(sizes, key=sizes.get) if sizes else 0
    parts: list[tuple[float, str]] = []  # (borde inferior, texto)
    notes: list[tuple[float, str]] = []
    emitted: set[int] = set()
    pending_labels: list[tuple[int, float, str]] = []
    for block in blocks:
        x0, y0, x1, y1 = block["bbox"]
        center = _center(block["bbox"])
        inside = next((i for i, (rect, _rows) in enumerate(tables) if rect.contains(center)), None)
        if inside is not None:  # el texto de una celda ya va dentro de la tabla
            if inside not in emitted:
                emitted.add(inside)
                parts.append((y1, table_markdown(tables[inside][1])))
            continue
        text = clean_ocr_noise(block["text"]).strip("\n")
        if not text.strip():
            continue
        rect = pymupdf.Rect(block["bbox"])
        caption_of = next((i for i, f in enumerate(figures) if _near(rect, f)), None) if _CAPTION.match(text.lstrip()) else None
        label_of = next((i for i, f in enumerate(figures) if f.contains(center)), None)
        if not structure:
            parts.append((y1, text))
        elif caption_of is not None:
            captioned.add(caption_of)
            parts.append((y1, FIGURE_PREFIX + " " + "\n".join(line.strip() for line in text.splitlines() if line.strip())))
        elif (
            label_of is not None
            and block["chars"] <= _LABEL_MAX_CHARS
            and block["lines"] <= _LABEL_MAX_LINES
            and block["size"] <= body_size * 1.1
        ):
            # Etiqueta dentro de una figura: se descarta si la figura tiene varias (ver más abajo).
            labelled[label_of] = labelled.get(label_of, 0) + 1
            pending_labels.append((label_of, y0, text))
        elif _is_margin_note(block, limits, page_width):
            notes.append((y0, MARGIN_PREFIX + " ".join(text.split())))
        elif _is_running_text(block, body_size, page_height):
            continue
        elif prefix := _heading_prefix(block, body_size):
            parts.append((y1, prefix + " ".join(text.split())))
        else:
            parts.append((y1, text))
    parts.extend((rect.y1, table_markdown(rows)) for i, (rect, rows) in enumerate(tables) if i not in emitted)
    # Las etiquetas de una figura con varias (nombres de partes, ejes, nodos) no son texto de la página.
    # Un texto corto suelto dentro de un recuadro (un título de cuadro, por ejemplo) sí se conserva.
    for index, y0, text in pending_labels:
        if labelled[index] < _MIN_LABELS:
            notes.append((y0, text))
    # Una figura con etiquetas o una imagen sin pie: solo se avisa de que hay una figura.
    for index, region in enumerate(figures):
        is_image = any(region == r for r in images)
        if index not in captioned and (labelled.get(index, 0) >= _MIN_LABELS or is_image):
            notes.append((region.y0, FIGURE_PREFIX))
    # Cada rótulo o aviso de figura va antes del primer párrafo que termina por debajo de su inicio (el que tiene a su lado).
    ordered = [text for _y, text in parts]
    for y, note in sorted(notes, key=lambda n: -n[0]):
        index = next((i for i, (bottom, _t) in enumerate(parts) if bottom > y + 3), len(parts))
        ordered.insert(index, note)
    return normalize_text("\n\n".join(ordered))


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


#: Tamaño máximo de la portada generada (igual que el que preparaba el navegador).
COVER_MAX_WIDTH = 640
COVER_MAX_HEIGHT = 900
COVER_MAX_BYTES = 450 * 1024
COVER_MAX_ZOOM = 2
COVER_QUALITIES = (85, 70, 55, 40)


def render_cover(doc) -> bytes | None:
    """JPEG de la primera página, de 640×900 px y 450 KB como máximo (la calidad baja hasta que cabe).
    `None` si la página no se puede dibujar o ni con la calidad mínima cabe."""
    try:
        page = doc[0]
        rect = page.rect
        zoom = min(COVER_MAX_WIDTH / rect.width, COVER_MAX_HEIGHT / rect.height, COVER_MAX_ZOOM)
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        for quality in COVER_QUALITIES:
            data = pixmap.tobytes("jpeg", jpg_quality=quality)
            if len(data) <= COVER_MAX_BYTES:
                return data
    except Exception:  # noqa: BLE001 — sin portada legible el libro usa la tapa con el título
        return None
    return None


def analyze_and_cover(data: bytes) -> dict:
    """Abre el PDF una vez y devuelve `{"data": <análisis>, "cover": <JPEG o None>}`.
    Un fallo al dibujar la portada no impide el análisis (ver `analyze` y `render_cover`)."""
    from .book_analyzer import analyze_document

    doc, err = open_document(data)
    if err:
        return err
    try:
        return {"data": analyze_document(doc), "cover": render_cover(doc)}
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
