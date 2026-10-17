"""Detectores de datos del libro (port de `server/test/analysis.test.js`)."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

import pymupdf
import pytest

from app.config_categorias import CATEGORIAS
from app.services.analysis.categories import detect_categories
from app.services.analysis.front_matter import (
    detect_authors_from_text,
    detect_edition,
    detect_publication_date,
    detect_publisher,
    detect_saga,
    split_authors,
    strip_saga_from_title,
)
from app.services.analysis.language import detect_language, get_stopwords
from app.services.analysis.pdf_info import read_pdf_metadata, xmp_reader
from app.services.analysis.synopsis import build_synopsis, find_blurb, summarize
from app.services.book_analyzer import analyze_document
from tests.helpers.make_pdf import make_pdf

SAMPLES = {
    "es": "El niño caminaba por la calle cuando vio que la puerta de la casa estaba abierta. No sabía qué hacer, pero decidió entrar porque había oído una voz que lo llamaba desde el fondo del pasillo. Su madre le había dicho que nunca hablara con extraños, aunque esta vez era diferente: la voz conocía su nombre y también el de su padre.",
    "en": "The boy was walking down the street when he saw that the door of the house was open. He did not know what to do, but he decided to go in because he had heard a voice calling him from the end of the hall. His mother had told him never to talk to strangers, but this time it was different: the voice knew his name and also the name of his father.",
    "pt": "O menino andava pela rua quando viu que a porta da casa estava aberta. Ele não sabia o que fazer, mas decidiu entrar porque tinha ouvido uma voz que o chamava do fundo do corredor. A mãe dele tinha dito que nunca falasse com estranhos, mas desta vez era diferente: a voz conhecia o nome dele e também o do pai.",
    "fr": "Le garçon marchait dans la rue quand il a vu que la porte de la maison était ouverte. Il ne savait pas quoi faire, mais il a décidé d'entrer parce qu'il avait entendu une voix qui l'appelait depuis le fond du couloir. Sa mère lui avait dit de ne jamais parler aux étrangers, mais cette fois c'était différent : la voix connaissait son nom et aussi celui de son père.",
    "it": "Il ragazzo camminava per la strada quando vide che la porta della casa era aperta. Non sapeva che cosa fare, ma decise di entrare perché aveva sentito una voce che lo chiamava dal fondo del corridoio. Sua madre gli aveva detto di non parlare mai con gli sconosciuti, ma questa volta era diverso: la voce conosceva il suo nome e anche quello di suo padre.",
    "de": "Der Junge ging die Straße entlang, als er sah, dass die Tür des Hauses offen war. Er wusste nicht, was er tun sollte, aber er beschloss hineinzugehen, weil er eine Stimme gehört hatte, die ihn vom Ende des Flurs rief. Seine Mutter hatte ihm gesagt, dass er nie mit Fremden sprechen solle, aber diesmal war es anders: die Stimme kannte seinen Namen und auch den seines Vaters.",
    "ca": "El noi caminava pel carrer quan va veure que la porta de la casa estava oberta. No sabia què fer, però va decidir entrar perquè havia sentit una veu que el cridava des del fons del passadís. La seva mare li havia dit que mai parlés amb estranys, però aquesta vegada era diferent: la veu coneixia el seu nom i també el del seu pare.",
}

#: Oraciones de fantasía sin diálogo: dan vocabulario repetido para clasificar y resumir.
FANTASY = [
    "El joven mago cruzó el reino de los dragones con la espada de su padre colgada a la espalda.",
    "Durante años la profecía había anunciado la caída del trono, y nadie en el castillo quería escucharla.",
    "La bruja del bosque preparó un hechizo antiguo para proteger a los elfos del ejército enemigo.",
    "En la torre más alta, el hechicero consultaba los libros de magia mientras el invierno cubría el reino.",
    "Los enanos de la montaña forjaron una espada capaz de herir incluso a los dragones más viejos.",
    "Nadie sabía que el mago guardaba el secreto del trono bajo la piedra del castillo olvidado.",
    "Cuando llegó la noche, el dragón sobrevoló el reino y la profecía comenzó a cumplirse.",
    "La reina convocó a los hechiceros para detener el hechizo que amenazaba a todo el reino.",
    "El viejo mago sonrió, porque sabía que la espada elegiría al heredero del trono.",
]


def fantasy_page(n: int) -> list[str]:
    """Una página de narración: párrafos de tres frases y alguna línea de diálogo."""

    def pick(i: int) -> str:
        return FANTASY[(n + i) % len(FANTASY)]

    return [
        pick(0), pick(1), pick(2), "",
        "- No dejaré que el dragón destruya el reino, dijo el mago.", "",
        pick(3), pick(4), pick(5), "",
        "- Entonces la espada será tuya, respondió la reina.", "",
        pick(6), pick(7), pick(8),
    ]  # fmt: skip


def text_of(lines: list[str]) -> str:
    return "\n".join(lines)


def test_categories_server_match_frontend():
    source = (Path(__file__).resolve().parents[2] / "src/features/libros/domain/categorias.js").read_text(encoding="utf-8")
    frontend = re.findall(r"'([^']+)'", source[source.index("Object.freeze") :])
    assert list(CATEGORIAS) == frontend


@pytest.mark.parametrize("code", list(SAMPLES))
def test_detect_language_latin(code):
    assert detect_language(SAMPLES[code]) == code


def test_detect_language_other_scripts_and_short_text():
    assert detect_language("これは日本語の文章です。私は毎日学校に行きます。今日は天気がとてもいいですね。") == "ja"
    assert detect_language("Это длинный русский текст о том, как мальчик шёл по улице и увидел открытую дверь.") == "ru"
    assert detect_language("Hola mundo") is None
    assert detect_language("") is None


def test_detect_edition():
    assert detect_edition("Segunda edición: mayo de 2018") == 2
    assert detect_edition("3.ª edición, 2020") == 3
    assert detect_edition("Fourth edition") == 4
    assert detect_edition("2nd edition") == 2
    assert detect_edition("Edición 5") == 5
    assert detect_edition("Primera edición, 1999\nTercera edición, 2005") == 3  # toma la mayor
    assert detect_edition("Edición 2015") is None  # un año no es un número de edición
    assert detect_edition("Sin datos de edición") is None


def test_detect_publication_date():
    today = datetime(2026, 10, 15)
    assert detect_publication_date("Primera edición: marzo de 2015", today=today) == {"fecha": "2015-03-01", "precision": "mes"}
    assert detect_publication_date("First published May 3, 1999", today=today) == {"fecha": "1999-05-03", "precision": "dia"}
    assert detect_publication_date("Impreso en México, 12 de septiembre de 2019", today=today) == {"fecha": "2019-09-12", "precision": "dia"}
    assert detect_publication_date("© 2008 Ana Pérez", today=today) == {"fecha": "2008-01-01", "precision": "anio"}
    assert detect_publication_date("© 2005, 2010", today=today)["fecha"] == "2005-01-01"  # el © más antiguo
    assert detect_publication_date("En octubre de 2019 viajé a Lima", today=today) is None  # sin etiqueta no cuenta
    assert detect_publication_date("© 2031", today=today) is None  # no acepta fechas futuras

    history = "Primera edición: marzo de 2010\nSegunda edición: mayo de 2018"
    assert detect_publication_date(history, today=today)["fecha"] == "2010-03-01"
    assert detect_publication_date(history, today=today, prefer_latest=True)["fecha"] == "2018-05-01"


def test_detect_publisher():
    assert detect_publisher("Título\n\nEditorial Siruela\nMadrid") == "Editorial Siruela"
    assert detect_publisher("Publicado por Ediciones del Viento, S.A.") == "Ediciones del Viento"
    assert detect_publisher("Published by Tor Books, New York") == "Tor Books"
    assert detect_publisher("© Penguin Random House Grupo Editorial") == "Penguin Random House"
    assert detect_publisher("El planeta rojo estaba lejos y la editorial no importaba.") is None
    assert detect_publisher("") is None


def test_authors():
    assert split_authors("Ana Pérez; Luis Gómez") == ["Ana Pérez", "Luis Gómez"]
    assert split_authors("Ana Pérez y Luis Gómez") == ["Ana Pérez", "Luis Gómez"]
    assert split_authors("Ana Pérez, Luis Gómez") == ["Ana Pérez", "Luis Gómez"]
    assert split_authors("Tolkien, J. R. R.") == ["Tolkien, J. R. R."]  # una sola coma no separa autores
    assert split_authors("Administrador") == []
    assert split_authors("Microsoft Word") == []
    assert split_authors("usuario@correo.com") == []

    assert detect_authors_from_text("Título\nPor Gabriel García Márquez\nEditorial X") == ["Gabriel García Márquez"]
    assert detect_authors_from_text("Autor: Ana Pérez") == ["Ana Pérez"]
    assert detect_authors_from_text("© 2015 Brandon Sanderson. Todos los derechos reservados.") == ["Brandon Sanderson"]
    assert detect_authors_from_text("© 2015 Penguin Random House Grupo Editorial") == []
    assert detect_authors_from_text("Por favor, no copie este libro.") == []


def test_detect_saga():
    assert detect_saga("Libro 2 de la saga Crónicas del Rey") == {"saga": "Crónicas del Rey", "numero": 2}
    assert detect_saga("Book Three of The Stormlight Archive") == {"saga": "The Stormlight Archive", "numero": 3}
    assert detect_saga("Tomo IV de la trilogía Memorias de Idhún") == {"saga": "Memorias de Idhún", "numero": 4}
    assert detect_saga("El Imperio Final (Nacidos de la bruma #1)") == {"saga": "Nacidos de la bruma", "numero": 1}
    assert detect_saga("Mistborn (Mistborn, Book 2)") == {"saga": "Mistborn", "numero": 2}
    assert detect_saga("Saga: Memorias de Idhún") == {"saga": "Memorias de Idhún", "numero": None}
    assert detect_saga("Libro 1 de poemas escogidos") is None  # sin "saga" ni artículo es ambiguo
    assert detect_saga("Nada que ver") is None

    assert strip_saga_from_title("El Imperio Final (Nacidos de la bruma #1)") == "El Imperio Final"
    assert strip_saga_from_title("Un título (con paréntesis)") == "Un título (con paréntesis)"


def test_pdf_metadata():
    xmp = {"dc:language": "es-ES", "dc:description": "Una descripción larga."}
    meta = read_pdf_metadata(
        {"Title": "El Imperio Final (Nacidos de la bruma #1)", "Author": "Brandon Sanderson; Ana Pérez", "Subject": "Fantasy", "Keywords": "magia"},
        lambda name: xmp.get(name, ""),
    )
    assert meta["titulo"] == "El Imperio Final"
    assert meta["titulo_original"] == "El Imperio Final (Nacidos de la bruma #1)"
    assert meta["autores"] == ["Brandon Sanderson", "Ana Pérez"]
    assert meta["pistas"] == ["Fantasy", "magia"]
    assert meta["idioma"] == "es"
    assert meta["descripcion"] == "Una descripción larga."

    junk = read_pdf_metadata({"Title": "Microsoft Word - Documento1.docx", "Author": "Administrador"})
    assert junk["titulo"] is None
    assert junk["autores"] == []
    assert read_pdf_metadata({})["autores"] == []


def test_xmp_reader():
    xml = (
        '<x:xmpmeta><rdf:RDF><rdf:Description>'
        '<dc:creator><rdf:Seq><rdf:li>Ana P&#233;rez</rdf:li><rdf:li>Luis G&amp;mez</rdf:li></rdf:Seq></dc:creator>'
        '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">Mi libro</rdf:li></rdf:Alt></dc:title>'
        "</rdf:Description></rdf:RDF></x:xmpmeta>"
    )
    get = xmp_reader(xml)
    assert get("dc:creator") == "Ana Pérez; Luis G&mez"
    assert get("dc:title") == "Mi libro"
    assert get("dc:publisher") == ""
    assert xmp_reader(None)("dc:title") == ""


def test_detect_categories():
    narrative = "\n\n".join(text_of(fantasy_page(i)) for i in range(6))
    assert detect_categories(narrative)[0] == "Fantasía"

    essay = "\n".join(
        "La historia de la civilización muestra que el imperio y la guerra marcaron cada siglo. El historiador estudia la dinastía y la colonia con método."
        for _ in range(60)
    )
    assert "Historia" in detect_categories(essay)
    assert "Fantasía" not in detect_categories(essay)

    assert detect_categories("texto breve", hints=["Science Fiction; Thriller"]) == ["Ciencia ficción", "Suspenso"]
    assert detect_categories("texto breve", hints=["Horror, Novela histórica"]) == ["Terror", "Novela histórica"]
    assert "Clásicos" in detect_categories("texto breve", year=1890)
    assert detect_categories("texto breve sin pistas") == []
    assert len(detect_categories(narrative, hints=["a", "b"])) <= 3


def test_synopsis():
    prose = "Una joven descubre que su aldea guarda un secreto antiguo y debe cruzar las montañas para encontrar a la única persona que conoce la verdad sobre su familia."
    assert build_synopsis(prose, [], []) == {"texto": prose, "origen": "metadatos"}

    blurb_page = {"pagina": 1, "texto": f"Título del libro\n\nSinopsis\n{prose}\n\nOtra línea sin relación."}
    assert find_blurb([blurb_page]) == prose
    assert find_blurb([{"pagina": 1, "texto": f"Sinopsis: {prose}"}]) == prose
    assert find_blurb([{"pagina": 1, "texto": "Sinopsis\ncorta"}]) is None
    assert build_synopsis(None, [blurb_page], [])["origen"] == "libro"

    pages = [{"pagina": i + 1, "texto": text_of(fantasy_page(i))} for i in range(5)]
    summary = summarize(pages, "El mago del reino", get_stopwords("es"))
    assert 120 <= len(summary) <= 700
    source = " ".join(p["texto"] for p in pages)
    for sentence in re.split(r"(?<=\.)\s+", summary):
        assert sentence in source, f"la frase debe venir del libro: {sentence}"
    assert "- No dejaré" not in summary  # no incluye diálogos
    assert build_synopsis(None, [], []) is None
    assert summarize([{"pagina": 1, "texto": "Muy corto."}]) is None


def book_pdf(info=None) -> bytes:
    """PDF de prueba: portada, créditos y varias páginas de fantasía en español."""
    return make_pdf(
        [
            ["El Imperio de los Dragones"],
            ["Editorial Siruela", "© 2015 Ana Pérez", "Segunda edición: mayo de 2018", "Libro 2 de la saga Crónicas del Rey", "Impreso en España"],
            *[fantasy_page(i) for i in range(8)],
        ],
        info=info,
    )


def analyze(data: bytes) -> dict:
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        return analyze_document(doc)


def test_analyze_combines_metadata_and_text():
    result = analyze(book_pdf({"Title": "El Imperio de los Dragones", "Author": "Ana Pérez", "Subject": "Fantasy"}))
    assert result["titulo"] == "El Imperio de los Dragones"
    assert result["autores"] == ["Ana Pérez"]
    assert result["fuentes"]["autores"] == "metadatos"
    assert result["idioma"] == "es"
    assert result["empresa_edicion"] == "Editorial Siruela"
    assert result["numero_edicion"] == 2
    assert result["fecha_publicacion"] == "2018-05-01"
    assert result["fecha_precision"] == "mes"
    assert result["saga"] == "Crónicas del Rey"
    assert result["numero_en_saga"] == 2
    assert result["categorias"][0] == "Fantasía"
    assert len(result["sinopsis"]) > 100
    assert result["fuentes"]["sinopsis"] == "inferido"
    assert result["paginas_analizadas"] == 10


def test_analyze_without_metadata_reads_authors_from_text():
    data = make_pdf([["El Imperio de los Dragones", "Por Ana Pérez"], *[fantasy_page(i) for i in range(4)]])
    result = analyze(data)
    assert result["autores"] == ["Ana Pérez"]
    assert result["fuentes"]["autores"] == "texto"
    for field in ("empresa_edicion", "numero_edicion", "fecha_publicacion", "saga", "numero_en_saga"):
        assert field not in result, f"no debe inventar {field}"

    assert analyze(make_pdf([[], []]))["fuentes"] == {}
