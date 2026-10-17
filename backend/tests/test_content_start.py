"""Detección de la página donde empieza el contenido de un libro (índice, créditos, prefacio...)."""

from __future__ import annotations

from app.services.analysis.content_start import BLANK, FRONT, MARKER, TEXT, TOC, _classify, detect_content_start

PROSE = (
    "Había una vez un reino lejano donde los inviernos duraban casi todo el año y las noches eran tan largas "
    "que los niños aprendían a leer a la luz de las velas. Cada mañana el pueblo entero salía a trabajar. "
) * 2


def book(*texts: str) -> list[dict]:
    return [{"pagina": number, "texto": text} for number, text in enumerate(texts, start=1)]


TOC_PAGE = "Índice\n\n" + "\n".join(f"Capítulo {n} ........................ {n * 12}" for n in range(1, 9))


def test_classifies_each_kind_of_page():
    assert _classify("") == BLANK
    assert _classify("12") == BLANK
    assert _classify(TOC_PAGE) == TOC
    assert _classify("Contenido\n\nUnidad 1   8 h\nUnidad 2   14 h\nTotal 22 h") == TOC
    assert _classify("Prefacio\n\n" + PROSE) == FRONT
    assert _classify("Primera edición 2018\nISBN 978-84-1234-567-8\nTodos los derechos reservados\n" + PROSE) == FRONT
    assert _classify("CAPÍTULO 1: INTRODUCCIÓN\n\n" + PROSE) == MARKER
    assert _classify("Unidad I. Introducción a la IA\n\nObjetivo de la unidad: " + PROSE) == MARKER
    assert _classify(PROSE) == TEXT
    # Un pie de página con © y sin año no convierte una página de texto en preliminar.
    assert _classify(PROSE + "\n\n© editorial 5") == TEXT


def test_skips_title_credits_index_and_preface_up_to_the_first_chapter():
    pages = book(
        "Mi libro\nUna novela",
        "Primera edición 2019. ISBN 978-1-23456-789-7\nTodos los derechos reservados.\n" + PROSE,
        TOC_PAGE,
        "Prólogo\n\n" + PROSE,
        PROSE,
        "Capítulo 1\n\nEl comienzo\n\n" + PROSE,
        *[PROSE] * 40,
    )
    assert detect_content_start(pages) == 6


def test_a_running_header_of_the_preface_extends_the_front_matter():
    pages = book("Título", TOC_PAGE, "PREFACIO\n\n" + PROSE, "PREFACIO\n\n" + PROSE, "Introducción\n\n" + PROSE, *[PROSE] * 40)
    assert detect_content_start(pages) == 5


def test_without_a_chapter_heading_a_gap_page_before_dense_text_marks_the_start():
    toc = "\n".join(f"Tema {n} . . . . . . . . . . . . . . . . . . . . . . {n * 9}" for n in range(1, 10))
    pages = book("Título", toc, toc, *([PROSE] * 8), "", PROSE, *([PROSE] * 40))
    # índice en 2-3, las páginas 4-11 son un prólogo sin encabezado, la 12 está vacía y el libro sigue en la 13
    assert detect_content_start(pages) == 13


def test_returns_none_when_there_is_nothing_to_skip():
    assert detect_content_start(book(*[PROSE] * 40)) is None
    assert detect_content_start(book("Solo", "dos páginas")) is None
    # Portada y capítulo 1 directamente: no hay preliminares que saltar.
    assert detect_content_start(book("Título", "Capítulo 1\n\n" + PROSE, *[PROSE] * 40)) is None


def test_ignores_pages_far_into_the_book_that_look_like_front_matter():
    # Una página de "créditos" a mitad del libro no mueve el comienzo.
    pages = book("Título", TOC_PAGE, "Capítulo 1\n\n" + PROSE, *[PROSE] * 80, "ISBN 978-1-23456-789-7\n" + PROSE)
    assert detect_content_start(pages) == 3


def test_pages_can_come_unordered():
    pages = book("Título", TOC_PAGE, "Introducción\n\n" + PROSE, *[PROSE] * 40)
    assert detect_content_start(list(reversed(pages))) == 3
