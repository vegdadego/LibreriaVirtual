"""PDF preparados: portada, análisis y lectura anticipada del texto (no necesitan MongoDB)."""

from __future__ import annotations

import time

import pytest

from app.errors import AppError
from app.services import pdf_worker, staged_uploads as st
from tests.helpers.make_pdf import make_numbered_pdf, make_pdf
from tests.test_analysis import book_pdf

OWNER = "a" * 24
OTHER = "b" * 24


@pytest.fixture(autouse=True)
def _clean_registry():
    st.reset_stages()
    yield
    st.reset_stages()


def test_render_cover_returns_a_small_jpeg_of_the_first_page():
    import pymupdf

    with pymupdf.open(stream=make_numbered_pdf(3), filetype="pdf") as doc:
        cover = pdf_worker.render_cover(doc)
    assert cover is not None
    assert cover[:3] == b"\xff\xd8\xff", "es un JPEG"
    assert len(cover) <= pdf_worker.COVER_MAX_BYTES


def test_render_cover_never_raises():
    assert pdf_worker.render_cover(object()) is None


def test_analyze_and_cover_opens_the_pdf_once_for_both():
    result = pdf_worker.analyze_and_cover(book_pdf({"Author": "Ana Pérez"}))
    assert result["data"]["autores"] == ["Ana Pérez"]
    assert result["cover"][:3] == b"\xff\xd8\xff"
    assert pdf_worker.analyze_and_cover(b"%PDF-1.4 roto")["error"]["code"] == "CORRUPT_PDF"


async def test_prepare_returns_analysis_and_cover_and_reads_the_text_in_the_background():
    stage = await st.prepare_stage(OWNER, book_pdf({"Author": "Ana Pérez"}))
    assert stage["analisis"]["autores"] == ["Ana Pérez"]
    assert stage["portada"]["mime"] == "image/jpeg" and stage["portada"]["data"][:3] == b"\xff\xd8\xff"
    assert len(stage["hash"]) == 64

    progress: list[dict] = []
    pages = await st.wait_pages(stage, progress.append)
    assert [p["pagina"] for p in pages] == list(range(1, 11))
    assert progress[-1] == {"paginas_procesadas": 10, "total_paginas": 10}
    assert stage["estado"] == st.READY
    assert stage["pdf"] is None, "el PDF no se conserva una vez leído"

    public = st.to_public_stage(stage)
    assert public["estado"] == "listo" and public["stageId"] == stage["id"]
    assert set(public) == {"stageId", "estado", "progreso", "paginasSinTexto"}, "sin PDF, texto, hash ni dueño"
    assert public["paginasSinTexto"] == 0

    # Esperar de nuevo (ya terminó) devuelve lo mismo al instante.
    assert await st.wait_pages(stage, lambda _p: None) == pages


async def test_the_stage_reports_how_many_pages_have_no_text():
    prose = "Había una vez un niño en la montaña, y cada mañana bajaba al río."
    stage = await st.prepare_stage(OWNER, make_pdf([[prose], [], ["12"], [prose], []]))
    assert "paginasSinTexto" not in st.to_public_stage(stage) or stage["estado"] == st.READY
    await st.wait_pages(stage, lambda _p: None)
    assert st.to_public_stage(stage)["paginasSinTexto"] == 3


async def test_a_stage_belongs_to_its_owner_and_can_be_discarded():
    stage = await st.prepare_stage(OWNER, make_numbered_pdf(2))
    assert st.get_stage(stage["id"], OWNER) is stage
    with pytest.raises(AppError) as other:
        st.get_stage(stage["id"], OTHER)
    assert other.value.status == 404 and other.value.code == "STAGE_NOT_FOUND"

    st.discard_stage(stage["id"], OTHER)  # otro usuario no puede descartarla
    assert st.get_stage(stage["id"], OWNER) is stage
    st.discard_stage(stage["id"], OWNER)
    st.discard_stage(stage["id"], OWNER)  # repetirlo no falla
    with pytest.raises(AppError):
        st.get_stage(stage["id"], OWNER)


async def test_preparing_another_pdf_replaces_the_previous_one_of_the_same_user():
    first = await st.prepare_stage(OWNER, make_numbered_pdf(2))
    second = await st.prepare_stage(OWNER, make_numbered_pdf(3))
    with pytest.raises(AppError):
        st.get_stage(first["id"], OWNER)
    assert st.get_stage(second["id"], OWNER) is second
    other = await st.prepare_stage(OTHER, make_numbered_pdf(2))
    assert st.get_stage(second["id"], OWNER) is second, "cada usuario tiene la suya"
    assert st.get_stage(other["id"], OTHER) is other


async def test_a_pdf_without_text_is_prepared_but_the_reading_reports_the_error():
    stage = await st.prepare_stage(OWNER, make_pdf([[], []]))
    with pytest.raises(AppError) as error:
        await st.wait_pages(stage, lambda _p: None)
    assert error.value.code == "NO_EXTRACTABLE_TEXT"
    assert st.stage_error(stage).code == "NO_EXTRACTABLE_TEXT"
    assert st.to_public_stage(stage)["error"]["code"] == "NO_EXTRACTABLE_TEXT"


async def test_a_corrupt_pdf_is_rejected_and_leaves_nothing_registered():
    with pytest.raises(AppError) as error:
        await st.prepare_stage(OWNER, b"%PDF-1.4 roto")
    assert error.value.code == "CORRUPT_PDF"
    assert not st._stages and not st._by_owner  # noqa: SLF001


async def test_expired_stages_disappear_and_refresh_extends_them():
    stage = await st.prepare_stage(OWNER, make_numbered_pdf(2))
    await st.wait_pages(stage, lambda _p: None)

    stage["expira"] = 0
    with pytest.raises(AppError):
        st.get_stage(stage["id"], OWNER)

    fresh = await st.prepare_stage(OWNER, make_numbered_pdf(2))
    fresh["expira"] = time.monotonic() + 5  # le quedan 5 s
    st.get_stage(fresh["id"], OWNER, refresh=True)
    assert fresh["expira"] > time.monotonic() + 60, "enviar el formulario la alarga otro TTL"


async def test_finishing_a_stage_releases_it():
    stage = await st.prepare_stage(OWNER, make_numbered_pdf(2))
    await st.wait_pages(stage, lambda _p: None)
    st.finish_stage(stage)
    with pytest.raises(AppError):
        st.get_stage(stage["id"], OWNER)
