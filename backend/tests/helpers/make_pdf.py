"""PDF mínimos y válidos para las pruebas, sin librerías (Helvetica con codificación WinAnsi,
por lo que admite acentos y ñ). Equivale a `server/test/helpers/makePdf.js` del backend anterior."""

from __future__ import annotations


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _content_stream(lines: list[str]) -> str:
    """Flujo de contenido de una página; una línea vacía deja un hueco de párrafo."""
    if not lines:
        return ""
    ops = ["BT", "/F1 12 Tf", "14 TL", "50 740 Td"]
    for index, line in enumerate(lines):
        if index > 0:
            ops.append("T*")
        if line != "":
            ops.append(f"({_escape(line)}) Tj")
    ops.append("ET")
    return "\n".join(ops)


def make_pdf(pages: list[list[str]], info: dict[str, str] | None = None) -> bytes:
    """Crea un PDF. `pages`: líneas de cada página (lista vacía = página sin texto).
    `info`: diccionario de metadatos (`Title`, `Author`, `Subject`...)."""
    objects: dict[int, str] = {}
    page_ids = [4 + i * 2 for i in range(len(pages))]
    info_id = 4 + len(pages) * 2

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>"
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"

    for page_id, lines in zip(page_ids, pages):
        stream = _content_stream(lines)
        objects[page_id] = (
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {page_id + 1} 0 R >>"
        )
        length = len(stream.encode("latin-1", "replace"))
        objects[page_id + 1] = f"<< /Length {length} >>\nstream\n{stream}\nendstream"

    if info:
        entries = " ".join(f"/{key} ({_escape(value)})" for key, value in info.items())
        objects[info_id] = f"<< {entries} >>"

    out = bytearray(b"%PDF-1.4\n")
    offsets: dict[int, int] = {}
    for object_id in sorted(objects):
        offsets[object_id] = len(out)
        out += f"{object_id} 0 obj\n{objects[object_id]}\nendobj\n".encode("latin-1", "replace")

    size = max(objects) + 1
    xref = ["xref", f"0 {size}", "0000000000 65535 f "]
    xref += [f"{offsets[i]:010d} 00000 n " for i in range(1, size)]
    info_ref = f" /Info {info_id} 0 R" if info else ""
    startxref = len(out)
    out += (
        "\n".join(xref) + f"\ntrailer\n<< /Size {size} /Root 1 0 R{info_ref} >>\nstartxref\n{startxref}\n%%EOF\n"
    ).encode("latin-1")
    return bytes(out)


def make_numbered_pdf(count: int) -> bytes:
    """PDF de `count` páginas con texto identificable y acentos."""
    return make_pdf(
        [
            [
                f"Página {i} - Capítulo único",
                f"Había una vez un niño en la montaña número {i}.",
                "",
                f"Segundo párrafo de la página {i}: canción, ñandú, ¿qué?",
            ]
            for i in range(1, count + 1)
        ]
    )
