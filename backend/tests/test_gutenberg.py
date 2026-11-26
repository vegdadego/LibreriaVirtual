"""Pruebas de las reglas de importación de Project Gutenberg (sin red ni base de datos)."""

from __future__ import annotations

from app.services import gutenberg

RDF = """<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcterms="http://purl.org/dc/terms/"
         xmlns:pgterms="http://www.gutenberg.org/2009/pgterms/">
  <pgterms:ebook rdf:about="ebooks/123">
    <dcterms:rights>{rights}</dcterms:rights>
    <dcterms:title>Marianela
Novela breve</dcterms:title>
    <dcterms:creator><pgterms:agent><pgterms:name>Pérez Galdós, Benito</pgterms:name></pgterms:agent></dcterms:creator>
    <dcterms:language><rdf:Description><rdf:value>es</rdf:value></rdf:Description></dcterms:language>
    <dcterms:type><rdf:Description><rdf:value>Text</rdf:value></rdf:Description></dcterms:type>
    <dcterms:subject><rdf:Description><rdf:value>Spanish fiction</rdf:value></rdf:Description></dcterms:subject>
    <pgterms:downloads>42</pgterms:downloads>
    <dcterms:hasFormat><pgterms:file rdf:about="https://www.gutenberg.org/ebooks/123.txt.utf-8">
      <dcterms:extent>{size}</dcterms:extent></pgterms:file></dcterms:hasFormat>
  </pgterms:ebook>
</rdf:RDF>"""


def rdf(rights: str = "Public domain in the USA.", size: int = 90_000) -> bytes:
    return RDF.format(rights=rights, size=size).encode("utf-8")


def candidate(book_id: int, title: str, language: str = "en", downloads: int = 1, subjects: list[str] | None = None) -> dict:
    return {"id": book_id, "titulo": title, "autores": ["Ana"], "idioma": language, "descargas": downloads,
            "materias": subjects or []}


def test_parse_rdf_reads_the_fields():
    book = gutenberg.parse_rdf(rdf())
    assert book["id"] == 123
    assert book["titulo"] == "Marianela: Novela breve"
    assert book["autores"] == ["Benito Pérez Galdós"]
    assert (book["idioma"], book["descargas"], book["bytes"]) == ("es", 42, 90_000)


def test_parse_rdf_rejects_protected_or_wrong_size():
    assert gutenberg.parse_rdf(rdf(rights="Copyrighted.")) is None
    assert gutenberg.parse_rdf(rdf(size=500_000)) is None
    assert gutenberg.parse_rdf(rdf(size=1_000)) is None


def test_natural_name():
    assert gutenberg.natural_name("Merliss, Reuben (Reuben Robert)") == "Reuben Merliss"
    assert gutenberg.natural_name("King, Martin Luther, Jr.") == "Martin Luther King, Jr."
    assert gutenberg.natural_name("Homer") == "Homer"
    assert gutenberg.natural_name("Anonymous") == ""
    assert gutenberg.natural_name("Byron, George Gordon Byron, Baron") == "George Gordon Byron"
    assert gutenberg.natural_name("Sunzi, active 6th century B.C.") == "Sunzi"
    assert gutenberg.natural_name("Lawrence, of the Resurrection, Brother") == "Lawrence of the Resurrection"
    assert gutenberg.natural_name("Walton, O. F., Mrs.") == "Mrs. O. F. Walton"
    assert gutenberg.natural_name("Tolstoy, Leo, graf") == "Leo Tolstoy"


def test_parse_rdf_removes_the_subtitle_mark():
    xml = rdf().replace(b"Marianela\nNovela breve", b"Marianela : $b Novela breve")
    assert gutenberg.parse_rdf(xml)["titulo"] == "Marianela: Novela breve"


def test_select_candidates_orders_and_filters():
    books = [
        candidate(1, "Popular", downloads=100),
        candidate(2, "Cuento", "es", downloads=1),
        candidate(3, "Ya importado"),
        candidate(4, "The Weekly Magazine"),
        candidate(5, "Historia, Vol. 2"),
        candidate(6, "Popular", downloads=5),
        candidate(7, "Repetido en base"),
        candidate(8, "Revista", subjects=["American periodicals"]),
        candidate(9, "Party Time", downloads=2),
        candidate(10, "Novela", subjects=["Erotic fiction"]),
        candidate(11, "Huck, Chapters 21 to 25"),
        candidate(12, "Shanties, Part I"),
        candidate(13, "Salud", subjects=["Category: Sexuality & Erotica"]),
    ]
    chosen = gutenberg.select_candidates(books, {3}, {gutenberg.book_key("Repetido en base", ["Ana"])})
    assert [b["id"] for b in chosen] == [2, 1, 9, 13]


def test_is_picture_book():
    assert gutenberg.is_picture_book("[Illustration] a [Illustration: b] " * 10, 30)
    assert not gutenberg.is_picture_book("[Illustration: portada]", 30)


def test_extract_paragraphs_removes_license_and_credits():
    text = (
        "Licencia\r\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\r\n\r\nProduced by Someone\r\n\r\n"
        "  CAPÍTULO _I_  \r\n\r\n[Illustration]\r\n\r\n[Illustration: El puerto]\r\n\r\nUna línea\r\notra línea\r\n\r\n"
        "[Transcriber's Note: errores corregidos.]\r\n\r\nThis eBook is public domain.\r\n\r\n"
        "End of the Project Gutenberg EBook\r\n\r\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\r\nMás licencia"
    )
    assert gutenberg.extract_paragraphs(text) == ["CAPÍTULO I", "[[figura]] El puerto", "Una línea\notra línea"]


def test_extract_paragraphs_without_markers_is_empty():
    assert gutenberg.extract_paragraphs("Un texto cualquiera") == []


def test_paginate_respects_sizes_and_keeps_the_text():
    paragraphs = ["palabra " * 60 for _ in range(100)] + ["larguísimo " * 1000, "\n".join(["verso"] * 900)]
    pages = gutenberg.paginate(paragraphs)
    assert [p["pagina"] for p in pages] == list(range(1, len(pages) + 1))
    assert all(len(p["texto"]) <= gutenberg.MAX_CHARS for p in pages)
    assert " ".join(p["texto"] for p in pages).split() == " ".join(paragraphs).split()


def test_describe_uses_english_summary_only_for_english_books():
    pages = [{"pagina": 1, "texto": "Texto breve."}]
    base = {"titulo": "T", "autores": ["Ana"], "materias": ["Poetry"],
            "resumen": '"T" is a short book. (This is an automatically generated summary.)'}
    english = gutenberg.describe({**base, "idioma": "en"}, pages)
    assert english["sinopsis"] == '"T" is a short book.'
    assert "Poesía" in english["categorias"]
    assert gutenberg.describe({**base, "idioma": "es"}, pages)["sinopsis"] == ""
