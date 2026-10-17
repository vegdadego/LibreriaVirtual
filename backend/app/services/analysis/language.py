"""Detección del idioma principal de un texto, sin servicios externos."""

from __future__ import annotations

import regex as re

from .text_utils import tokenize

#: Palabras muy frecuentes de cada idioma con alfabeto latino (sin acentos).
STOPWORDS = {
    "es": "de la que el en y a los se del las un por con no una su para es al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos esto antes algunos unos yo otro otras otra el tanto esa estos mucho nada ella estar estas algo mi mis te tu tus fue era han ser son estaba tenia hacia",
    "en": "the of and to in a is that it was for on as with he she his her had you not be at by this but from they we said have which were are or an their there been would what who will one all when out up him them into then more could no so if about than its did my me do your how can over only some these other time like very after our just where most also two first",
    "pt": "o a os as de do da dos das que e em um uma para com nao por mais mas como foi ele ela eu voce sao esta ao na no nas nos se seu sua seus suas ja tambem muito quando entre depois sem mesmo ate ser tem tinha havia isso este essa isto ou ainda so cada",
    "fr": "le la les des du de un une et est que qui dans pour pas sur au aux avec ce il elle nous vous ils je tu ne se son sa ses mais ou cette ces plus par comme etait fait tout bien sans sous etre avait dit leur leurs mon ma mes lui y en on si quand encore meme deja",
    "it": "il lo la i gli le di che e un una per con non sono del della dei delle nel nella si come piu ma anche io tu lui lei questo questa era ha hanno suo sua suoi cosa quando tutto tutti essere alla alle degli dal dalla poi molto gia ancora senza sempre",
    "de": "der die das und ist nicht ein eine zu den dem von mit sich auf fur es auch im als er sie wir ich dass aber wie nur war hat noch nach bei aus wenn oder uber so ihr sein einen einem einer dann hatte werden wurde wird kann mehr schon immer",
    "ca": "el la els les de del dels que i a en un una per amb no es com mes pero tambe han ha va aquest aquesta seu seva seus seves molt quan entre despres sense mateix fins ser te tenia hi li ho vaig ens",
    "la": "et in est non ad cum quod ut sed de ex per quae qui si sunt esse hoc haec ab enim autem nec ergo quo eius eum eam ei se sibi tamen quam omnes omnibus",
}

STOP_SETS = {code: frozenset(words.split(" ")) for code, words in STOPWORDS.items()}

#: Alfabetos no latinos: (código, expresión que reconoce sus letras).
SCRIPTS = [
    ("ja", re.compile(r"[぀-ヿ]")),
    ("ko", re.compile(r"[가-힯]")),
    ("ru", re.compile(r"[Ѐ-ӿ]")),
    ("zh", re.compile(r"[一-鿿]")),
]

MAX_CHARS = 30000
MIN_WORDS = 40
MIN_SCORE = 0.12
MIN_MARGIN = 1.25

_LETTER = re.compile(r"\p{L}")


def get_stopwords(code: str | None) -> frozenset[str]:
    """Palabras vacías (sin acentos) de un idioma, para ignorarlas al resumir. Vacío si se desconoce."""
    return STOP_SETS.get(code, frozenset())


def detect_language(text: str | None) -> str | None:
    """Idioma principal de un texto: `es`, `en`, `pt`, `fr`, `it`, `de`, `ca`, `la`, `ja`, `ko`,
    `ru` o `zh`; `None` si no hay texto suficiente o dos idiomas empatan.

    Los alfabetos no latinos se reconocen por sus caracteres; los latinos, por la proporción de
    palabras funcionales (artículos, preposiciones...) de cada idioma.
    """
    sample = (text or "")[:MAX_CHARS]
    letters = len(_LETTER.findall(sample))
    if letters < 30:
        return None

    # `ja` va antes que `zh`: el japonés mezcla kana con caracteres chinos.
    for code, pattern in SCRIPTS:
        if len(pattern.findall(sample)) / letters > 0.3:
            return code

    words = tokenize(sample)
    if len(words) < MIN_WORDS:
        return None

    total = len(words)
    scores = sorted(
        ((code, sum(1 for word in words if word in stop) / total) for code, stop in STOP_SETS.items()),
        key=lambda item: item[1],
        reverse=True,
    )
    best, second = scores[0], scores[1]
    if best[1] < MIN_SCORE or best[1] < second[1] * MIN_MARGIN:
        return None
    return best[0]
