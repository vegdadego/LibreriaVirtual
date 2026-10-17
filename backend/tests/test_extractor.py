"""Lectura del texto de un PDF (port de `server/test/extractor.test.js`)."""

from __future__ import annotations

import pytest

from app.errors import AppError
from app.services.pdf_text import extract_pdf_pages, looks_like_pdf
from tests.helpers.make_pdf import make_numbered_pdf, make_pdf


def expected_text(n: int) -> str:
    return (
        f"Página {n} - Capítulo único\n"
        f"Había una vez un niño en la montaña número {n}.\n\n"
        f"Segundo párrafo de la página {n}: canción, ñandú, ¿qué?"
    )


async def test_extracts_30_pages_in_order_with_accents_and_paragraphs():
    progress: list[int] = []
    pages = await extract_pdf_pages(make_numbered_pdf(30), on_progress=lambda p: progress.append(p["paginas_procesadas"]))
    assert len(pages) == 30
    for index, page in enumerate(pages, start=1):
        assert page["pagina"] == index
        assert page["texto"] == expected_text(index)
    assert progress[0] == 0
    assert progress[-1] == 30


async def test_large_pdf_is_split_across_processes_and_keeps_order(monkeypatch):
    monkeypatch.setenv("PDF_PARALLEL_MIN_PAGES", "10")
    progress: list[int] = []
    pages = await extract_pdf_pages(make_numbered_pdf(60), on_progress=lambda p: progress.append(p["paginas_procesadas"]))
    assert [p["pagina"] for p in pages] == list(range(1, 61))
    assert all(page["texto"] == expected_text(page["pagina"]) for page in pages)
    assert progress[0] == 0 and progress[-1] == 60
    assert progress == sorted(progress), "el progreso nunca retrocede"


async def test_keeps_empty_pages_to_preserve_numbering():
    pages = await extract_pdf_pages(make_pdf([["uno"], [], ["tres"]]))
    assert pages == [
        {"pagina": 1, "texto": "uno"},
        {"pagina": 2, "texto": ""},
        {"pagina": 3, "texto": "tres"},
    ]


async def test_rejects_corrupt_pdf():
    with pytest.raises(AppError) as error:
        await extract_pdf_pages(make_numbered_pdf(3)[:120])
    assert error.value.code == "CORRUPT_PDF"
    assert error.value.status == 422


async def test_rejects_pdf_without_extractable_text():
    with pytest.raises(AppError) as error:
        await extract_pdf_pages(make_pdf([[], []]))
    assert error.value.code == "NO_EXTRACTABLE_TEXT"


async def test_rejects_more_pages_than_allowed():
    with pytest.raises(AppError) as error:
        await extract_pdf_pages(make_numbered_pdf(3), max_pages=2)
    assert error.value.code == "TOO_MANY_PAGES"


async def test_rejects_text_that_exceeds_the_allowed_size():
    with pytest.raises(AppError) as error:
        await extract_pdf_pages(make_numbered_pdf(3), max_content_bytes=100)
    assert error.value.code == "CONTENT_TOO_LARGE"


async def test_drops_ocr_noise_but_keeps_real_text_and_toc_lines():
    pages = await extract_pdf_pages(
        make_pdf(
            [
                [
                    "Indice",
                    "J^OiA",
                    "\\ ;ne> \\(r>(-/j'~u.",
                    "INTELIGENCIA ARTIFICIAL",
                    "CAPITULO 1 " + "." * 40 + " 7",
                    "12",
                    "C:\\Users\\erick\\libros",
                ]
            ]
        )
    )
    lines = pages[0]["texto"].splitlines()
    assert "J^OiA" not in lines
    assert not any("ne>" in line for line in lines)
    assert "INTELIGENCIA ARTIFICIAL" in lines
    assert "CAPITULO 1 ..... 7" in lines
    assert "12" in lines
    assert "C:\\Users\\erick\\libros" in lines


def test_clean_ocr_noise_removes_empty_glyphs():
    from app.services.pdf_worker import clean_ocr_noise

    assert clean_ocr_noise("Hola \u25a0 mundo\ufffd") == "Hola  mundo"


def test_looks_like_pdf():
    assert looks_like_pdf(make_pdf([["x"]])) is True
    assert looks_like_pdf(b"hola mundo") is False
    assert looks_like_pdf(b"") is False


def _pdf_with_table() -> bytes:
    """Una página con texto, una tabla con bordes de 3 columnas y más texto."""
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 60), "Antes de la tabla", fontsize=11)
    xs, ys = [50, 170, 290, 410], [100, 130, 160, 190]
    for x in xs:
        page.draw_line((x, ys[0]), (x, ys[-1]))
    for y in ys:
        page.draw_line((xs[0], y), (xs[-1], y))
    rows = [["Nombre", "Edad", "Ciudad"], ["Ana", "30", "Quito"], ["Luis", "41", "Lima"]]
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            page.insert_text((xs[c] + 6, ys[r] + 20), value, fontsize=11)
    page.insert_text((50, 230), "Después de la tabla", fontsize=11)
    return doc.tobytes()


async def test_tables_with_borders_come_out_as_markdown_rows_in_place():
    pages = await extract_pdf_pages(_pdf_with_table())
    assert pages[0]["texto"] == (
        "Antes de la tabla\n\n"
        "| Nombre | Edad | Ciudad |\n| --- | --- | --- |\n| Ana | 30 | Quito |\n| Luis | 41 | Lima |\n\n"
        "Después de la tabla"
    )


def test_table_cells_escape_pipes_and_degenerate_tables_are_dropped():
    from app.services.pdf_worker import _clean_table, table_markdown

    assert table_markdown([["a|b", "c"], ["1", "2"]]) == "| a\\|b | c |\n| --- | --- |\n| 1 | 2 |"
    assert _clean_table([["solo", "una fila"]]) == []
    assert _clean_table([["uno"], ["dos"], ["tres"]]) == [], "una sola columna no es una tabla"
    assert _clean_table([["", "", ""], ["", "x", ""], ["", "", ""]]) == []
    assert _clean_table([["a", "", "b"], ["c", "", "d"]]) == [["a", "b"], ["c", "d"]], "quita columnas vacías"


def test_page_text_can_leave_tables_as_plain_text_for_the_analyzer():
    import pymupdf

    from app.services.pdf_worker import page_text

    with pymupdf.open(stream=_pdf_with_table(), filetype="pdf") as doc:
        plain = page_text(doc[0], with_tables=False, structure=False)
    assert "|" not in plain and "Nombre" in plain


def test_page_text_puts_margin_labels_before_the_paragraph_beside_them():
    import pymupdf

    from app.services.pdf_worker import MARGIN_PREFIX, page_text

    body = "Texto del cuerpo de la pagina que es largo y sigue para ser cuerpo. " * 3
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_textbox((150, 60, 550, 200), body + "primero", fontsize=10)
    page.insert_textbox((150, 260, 550, 400), body + "segundo", fontsize=10)
    page.insert_textbox((30, 262, 130, 290), "PRUEBA DE TURING", fontsize=6)

    paragraphs = page_text(page).split("\n\n")

    assert paragraphs[1] == f"{MARGIN_PREFIX}PRUEBA DE TURING"
    assert paragraphs[0].endswith("primero") and paragraphs[2].endswith("segundo")


def test_page_text_drops_running_headers_and_page_numbers_and_marks_headings():
    import pymupdf

    from app.services.pdf_worker import SUBTITLE_PREFIX, TITLE_PREFIX, page_text

    body = "Texto del cuerpo de la pagina que es largo y sigue para ser cuerpo. " * 3
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 40), "INTRODUCCION 3", fontsize=8)
    page.insert_text((50, 100), "3.3 Busqueda de soluciones", fontsize=20)
    page.insert_textbox((50, 120, 500, 200), body, fontsize=11)
    page.insert_text((50, 230), "Un subtitulo", fontsize=14)
    page.insert_textbox((50, 240, 500, 320), body, fontsize=11)
    page.insert_text((290, 800), "12", fontsize=9)

    paragraphs = page_text(page).split("\n\n")

    assert paragraphs[0] == TITLE_PREFIX + "3.3 Busqueda de soluciones"
    assert paragraphs[2] == SUBTITLE_PREFIX + "Un subtitulo"
    assert len(paragraphs) == 4  # sin encabezado corrido ni número de página
    assert "12" not in paragraphs[-1].split()[-1:]
    assert "INTRODUCCION" not in page_text(page)


def test_page_text_drops_figure_labels_keeps_the_caption_and_flags_image_only_figures():
    import pymupdf

    from app.services.pdf_worker import FIGURE_PREFIX, page_text

    body = "Texto del cuerpo de la pagina que es largo y sigue para ser cuerpo. " * 3
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_textbox((50, 40, 500, 120), body, fontsize=11)
    # Figura de dibujo con tres etiquetas y su pie debajo.
    for i in range(8):
        page.draw_rect((100 + i * 25, 150, 130 + i * 25, 250))
    for i, label in enumerate(["Dendrita", "Axon", "Nucleo"]):
        page.insert_text((110 + i * 60, 170 + i * 30), label, fontsize=7)
    page.insert_textbox((50, 270, 500, 310), "Figura 1.2 Partes de una celula.", fontsize=9)
    # Imagen sin pie.
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 200, 120), False)
    pix.set_rect(pix.irect, (200, 100, 50))
    page.insert_image(pymupdf.Rect(100, 400, 300, 520), pixmap=pix)

    paragraphs = page_text(page).split("\n\n")

    assert not any(label in page_text(page) for label in ("Dendrita", "Axon", "Nucleo"))
    assert f"{FIGURE_PREFIX} Figura 1.2 Partes de una celula." in paragraphs
    assert paragraphs[-1] == FIGURE_PREFIX  # la imagen sin pie solo deja el aviso
