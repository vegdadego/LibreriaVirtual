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


def test_looks_like_pdf():
    assert looks_like_pdf(make_pdf([["x"]])) is True
    assert looks_like_pdf(b"hola mundo") is False
    assert looks_like_pdf(b"") is False
