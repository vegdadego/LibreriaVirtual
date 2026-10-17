"""Compara motores de lectura de PDF para elegir el más rápido que conserve los párrafos.

Genera un PDF sintético parecido a un libro (párrafos con sangría de interlineado, acentos y
ñ), lo lee con cada motor y mide páginas por segundo. También cuenta los saltos de párrafo
("\\n\\n") que conserva cada uno frente a los que tiene el PDF.

Uso (desde backend/):
    python -m scripts.bench_extractors [--pages 300] [--runs 3] [--node]

`--node` añade la línea base de pdf.js del backend anterior (server/), si todavía existe.
"""

from __future__ import annotations

import argparse
import random
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
WORDS = (
    "el la de que y en un una los las del por con para como pero más este esta sus también "
    "mago dragón reino espada castillo bosque noche camino historia ventana corazón silencio "
    "montaña profecía hermano ciudad viejo joven pequeño lejano oscuro canción niño señor "
    "había estaba nunca siempre entonces mientras después aunque porque cuando donde nadie"
).split()
LINE_HEIGHT = 14.0
PARAGRAPH_EXTRA = 10.0
LINES_PER_PAGE = 40


def make_book(pages: int, seed: int = 7) -> tuple[bytes, int]:
    """PDF sintético de `pages` páginas. Devuelve (bytes, párrafos totales)."""
    rng = random.Random(seed)
    doc = pymupdf.open()
    paragraphs = 0
    for _ in range(pages):
        page = doc.new_page(width=420, height=640)
        y = 60.0
        lines_left = LINES_PER_PAGE
        while lines_left > 3:
            n_lines = min(rng.randint(3, 7), lines_left)
            paragraphs += 1
            for _ in range(n_lines):
                text = " ".join(rng.choice(WORDS) for _ in range(9)).capitalize() + "."
                page.insert_text((40, y), text, fontsize=11, fontname="helv")
                y += LINE_HEIGHT
            y += PARAGRAPH_EXTRA
            lines_left -= n_lines + 1
    data = doc.tobytes()
    doc.close()
    return data, paragraphs


def median(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def group_lines(items: list[tuple[float, float, str]]) -> str:
    """Mismo algoritmo que `buildPageText` del backend Node (huecos entre líneas)."""
    lines: list[list] = []
    current = None
    for y, height, text in items:
        if current is not None and abs(current[0] - y) <= height * 0.5:
            current[2] += text
            current[1] = max(current[1], height)
        else:
            current = [y, height, text]
            lines.append(current)
    printable = [ln for ln in lines if ln[2].strip()]
    if not printable:
        return ""
    gaps = [b[0] - a[0] for a, b in zip(printable, printable[1:]) if b[0] - a[0] > 0]
    typical = median(gaps) if len(gaps) >= 3 else 0.0
    out = [printable[0][2]]
    for a, b in zip(printable, printable[1:]):
        gap = b[0] - a[0]
        threshold = typical * 1.4 if typical else max(a[1], b[1]) * 1.8
        out.append(("\n\n" if gap > threshold else "\n") + b[2])
    return "".join(out)


# --- Variantes de PyMuPDF ----------------------------------------------------------------


def pymupdf_text(data: bytes) -> list[str]:
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        return [page.get_text("text") for page in doc]


def pymupdf_blocks(data: bytes) -> list[str]:
    """Párrafo = bloque de MuPDF: una sola llamada por página, sin lógica en Python."""
    out = []
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            blocks = page.get_text("blocks", flags=pymupdf.TEXTFLAGS_TEXT & ~pymupdf.TEXT_PRESERVE_LIGATURES)
            parts = [b[4].strip("\n") for b in blocks if b[6] == 0 and b[4].strip()]
            out.append("\n\n".join(parts))
    return out


def pymupdf_dict(data: bytes) -> list[str]:
    """Líneas con su línea base real (`origin`) + el algoritmo de huecos de Node."""
    out = []
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            items = []
            for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]:
                if block["type"] != 0:
                    continue
                for line in block["lines"]:
                    spans = line["spans"]
                    if not spans:
                        continue
                    items.append(
                        (spans[0]["origin"][1], spans[0]["size"], "".join(s["text"] for s in spans))
                    )
            out.append(group_lines(items))
    return out


def pymupdf_words(data: bytes) -> list[str]:
    """Palabras agrupadas por (bloque, línea) + huecos de Node, con la base de cada línea."""
    out = []
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            lines: dict[tuple[int, int], list] = {}
            for x0, y0, x1, y1, word, block, line, _ in page.get_text("words"):
                lines.setdefault((block, line), []).append((y1, y1 - y0, word))
            items = [
                (ws[0][0], ws[0][1], " ".join(w[2] for w in ws)) for _, ws in sorted(lines.items())
            ]
            out.append(group_lines(items))
    return out


# --- Otros motores ------------------------------------------------------------------------


def pypdfium2_text(data: bytes) -> list[str]:
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(data)
    try:
        out = []
        for index in range(len(pdf)):
            page = pdf[index]
            textpage = page.get_textpage()
            out.append(textpage.get_text_range())
            textpage.close()
            page.close()
        return out
    finally:
        pdf.close()


def pypdf_text(data: bytes) -> list[str]:
    import io

    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return [page.extract_text() or "" for page in reader.pages]


ENGINES = {
    "PyMuPDF text (sin diseño)": pymupdf_text,
    "PyMuPDF blocks (párrafo = bloque)": pymupdf_blocks,
    "PyMuPDF words + huecos": pymupdf_words,
    "PyMuPDF dict + huecos": pymupdf_dict,
    "pypdfium2 text": pypdfium2_text,
    "pypdf extract_text": pypdf_text,
}


def bench(fn, data: bytes, runs: int) -> tuple[float, list[str]]:
    fn(data)  # calentamiento (importaciones, cachés)
    best = float("inf")
    result: list[str] = []
    for _ in range(runs):
        start = time.perf_counter()
        result = fn(data)
        best = min(best, time.perf_counter() - start)
    return best, result


def bench_node(path: Path, runs: int) -> float | None:
    script = ROOT / "server" / "src" / "services" / "pdfTextExtractor.js"
    if not script.exists():
        return None
    runner = path.with_name("bench_node.mjs")
    runner.write_text(
        "\n".join(
            [
                "import {readFileSync} from 'node:fs';",
                f"const {{extractPdfPages}} = await import('{script.as_uri()}');",
                # pdf.js se queda con el ArrayBuffer (lo "transfiere"), así que cada vuelta lee el archivo de nuevo.
                "const load = () => readFileSync(process.argv[2]);",
                "await extractPdfPages(load());",
                "let best = Infinity;",
                f"for (let i = 0; i < {runs}; i++) {{ const buffer = load(); const t = performance.now(); await extractPdfPages(buffer); best = Math.min(best, performance.now() - t); }}",
                "console.log(best);",
            ]
        ),
        encoding="utf-8",
    )
    done = subprocess.run(["node", str(runner), str(path)], capture_output=True, text=True, cwd=ROOT / "server")
    if done.returncode != 0:
        print("  (no se pudo medir pdf.js:", done.stderr.strip()[:200], ")")
        return None
    return float(done.stdout.strip()) / 1000




def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pages", type=int, default=300)
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--node", action="store_true", help="incluir la línea base pdf.js de server/")
    args = parser.parse_args()

    data, paragraphs = make_book(args.pages)
    print(f"PDF sintético: {args.pages} páginas, {len(data) / 1024:.0f} KB, {paragraphs} párrafos\n")
    print(f"{'motor':38} {'tiempo':>9} {'págs/s':>9} {'ms/pág':>8} {'párrafos':>9}")

    rows = []
    for name, fn in ENGINES.items():
        seconds, pages = bench(fn, data, args.runs)
        kept = sum(page.count("\n\n") + (1 if page.strip() else 0) for page in pages)
        rows.append((name, seconds, kept))

    if args.node:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bench.pdf"
            path.write_bytes(data)
            seconds = bench_node(path, args.runs)
        if seconds is not None:
            rows.append(("pdf.js (backend Node actual)", seconds, None))

    for name, seconds, kept in rows:
        speed = args.pages / seconds
        kept_text = f"{kept}" if kept is not None else "—"
        print(f"{name:38} {seconds * 1000:8.1f}ms {speed:9.0f} {seconds * 1000 / args.pages:8.2f} {kept_text:>9}")
    print("\n'párrafos' = saltos de párrafo que conserva cada motor (el PDF tiene", paragraphs, ")")


if __name__ == "__main__":
    sys.exit(main())
