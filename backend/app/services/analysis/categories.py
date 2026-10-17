"""Propuesta de categorías para un libro a partir de su texto y de las palabras clave del PDF."""

from __future__ import annotations

from collections import Counter

import regex as re

from ...config_categorias import CATEGORIAS
from .text_utils import fold, tokenize

#: Raíces de palabras (sin acentos, español e inglés) que delatan cada categoría. Una palabra
#: del texto cuenta si empieza por la raíz; por eso las raíces son largas. `Clásicos` no tiene
#: palabras: se deduce de la fecha de publicación.
KEYWORDS: dict[str, list[str]] = {
    "Terror": ["terror", "horror", "fantasm", "ghost", "haunt", "maldic", "curse", "pesadill", "nightmare", "demoni", "demon", "vampir", "zombi", "cadaver", "corpse", "sobrenatural", "supernatural", "macabr", "sangrient", "bloody", "cementerio", "graveyard", "escalofri"],
    "Fantasía": ["magia", "magic", "mago", "maga", "wizard", "hechic", "hechiz", "sorcer", "spell", "dragon", "elfo", "elfa", "elves", "enano", "dwarf", "orco", "trono", "throne", "profec", "prophe", "brujeri", "witch", "bruja", "hada", "fairy", "reino", "kingdom", "espada", "sword", "conjuro"],
    "Ciencia ficción": ["nave", "espacial", "spaceship", "starship", "planeta", "planet", "galaxi", "robot", "androide", "android", "alienigen", "extraterrest", "alien", "cyborg", "hiperespacio", "hyperspace", "laser", "futurist", "dystop", "distop", "teletransport", "colonizar", "orbita", "astronauta"],
    "Misterio": ["misterio", "mystery", "detective", "asesinat", "murder", "crimen", "pista", "clue", "sospechos", "suspect", "investigaci", "investigat", "inspector", "culpable", "forense", "comisari", "coartada", "alibi"],
    "Suspenso": ["suspense", "suspenso", "thriller", "persecuci", "chase", "secuestr", "kidnap", "amenaza", "threat", "conspirac", "conspiracy", "espia", "spy", "terrorista", "rehen", "hostage", "huida", "acecha"],
    "Romance": ["amor", "love", "beso", "kiss", "corazon", "heart", "romanc", "enamora", "novio", "novia", "boda", "wedding", "pasion", "passion", "caricia", "amante", "lover", "cortejo"],
    "Aventura": ["aventur", "adventure", "expedici", "tesoro", "treasure", "isla", "island", "pirata", "pirate", "selva", "jungle", "explorador", "explorer", "travesia", "naufrag", "brujula", "compass"],
    "Drama": ["dolor", "tristeza", "sadness", "lagrima", "tears", "divorcio", "funeral", "enfermedad", "illness", "duelo", "grief", "soledad", "loneliness", "familia", "family", "perdida", "culpa", "remordimiento"],
    "Novela histórica": ["imperio", "empire", "emperador", "emperor", "monarqu", "reina", "queen", "conde", "duque", "duke", "corte", "revoluci", "medieval", "ejercito", "army", "batalla", "battle", "caballero", "knight", "siglo", "century", "castillo", "castle"],
    "Humor": ["humor", "risa", "laugh", "chiste", "joke", "comedi", "gracios", "funny", "divertid", "hilar", "satira", "satire", "ridicul", "carcajad"],
    "Poesía": ["poema", "poem", "verso", "verse", "soneto", "sonnet", "poeta", "poet", "poesi", "estrofa", "stanza", "rima", "elegia", "oda"],
    "Biografía": ["biograf", "autobiograf", "memorias", "memoir", "infancia", "childhood", "nacio", "born", "juventud", "su vida", "his life", "her life", "fallecio", "trayectoria"],
    "Historia": ["historia", "history", "historiador", "historian", "civilizaci", "civilization", "arqueolog", "archaeolog", "antiguedad", "antiquity", "dinasti", "dynasty", "colonial", "imperio", "empire", "guerra", "war", "siglo", "century"],
    "Ciencia": ["cientific", "scientific", "experiment", "teoria", "theory", "fisica", "physics", "quimica", "chemistry", "biologia", "biology", "evoluci", "evolution", "molecul", "ecuacion", "equation", "hipotesis", "hypothesis", "celula", "cell", "atomo", "atom", "universo", "universe", "energia", "energy"],
    "Filosofía": ["filosof", "philosoph", "etica", "ethic", "metafisic", "metaphysic", "existencia", "existence", "epistemolog", "moral", "ontolog", "conocimiento", "knowledge", "racional", "dialectic", "kant", "nietzsche", "platon", "aristotel"],
    "Psicología": ["psicolog", "psycholog", "terapia", "therapy", "conducta", "behavior", "behaviour", "ansiedad", "anxiety", "cerebro", "brain", "inconsciente", "unconscious", "cognitiv", "trauma", "emocion", "emotion", "mente", "mental"],
    "Autoayuda": ["exito", "success", "habito", "habit", "motivaci", "motivation", "liderazgo", "leadership", "productiv", "objetivo", "goal", "mentalidad", "mindset", "felicidad", "happiness", "superaci", "autoestima", "bienestar", "wellbeing"],
    "Educación": ["alumno", "estudiante", "student", "aprendizaje", "learning", "ensenanza", "teaching", "docente", "teacher", "maestro", "escuela", "school", "ejercicio", "exercise", "leccion", "lesson", "curriculum", "pedagog", "didactic"],
    "Infantil": ["erase una vez", "habia una vez", "once upon a time", "cuento", "ositos", "conejito", "bunny", "dibujos", "colorear", "mamita", "abuelita", "princesita", "travieso"],
    "Juvenil": ["instituto", "adolescent", "teenager", "colegio", "secundaria", "high school", "companero de clase", "classmate", "primer beso", "prom"],
    "Cómic y manga": ["vineta", "manga", "comic", "onomatopey", "superheroe", "superhero", "panel", "shonen", "seinen", "anime"],
}

#: Otras formas de nombrar una categoría en la materia o las palabras clave de un PDF (sin acentos).
DECLARED_ALIASES: dict[str, list[str]] = {
    "Terror": ["horror"],
    "Fantasía": ["fantasy", "fantastic"],
    "Ciencia ficción": ["cfiction"],
    "Misterio": ["mystery", "detective", "policiac"],
    "Suspenso": ["suspense", "thriller", "intriga"],
    "Romance": ["romantic", "romantica"],
    "Aventura": ["adventure", "aventuras"],
    "Drama": ["drama"],
    "Novela histórica": ["historical fiction", "novela historica"],
    "Clásicos": ["classic", "clasico"],
    "Humor": ["comedy", "comedia", "satira", "satire"],
    "Poesía": ["poetry", "poesia", "poemas"],
    "Biografía": ["biography", "memoir", "memorias", "autobiograf"],
    "Historia": ["history", "historia"],
    "Ciencia": ["science", "cientific"],  # "science fiction" ya se sustituyó por la marca
    "Filosofía": ["philosophy", "filosofia"],
    "Psicología": ["psychology", "psicologia"],
    "Autoayuda": ["self-help", "self help", "superacion personal", "desarrollo personal"],
    "Educación": ["education", "educacion", "textbook", "libro de texto"],
    "Infantil": ["children", "infantil", "kids", "ninos"],
    "Juvenil": ["young adult", "juvenil", "ya fiction"],
    "Cómic y manga": ["comic", "manga", "graphic novel", "novela grafica"],
}

#: Categorías de no ficción: pierden peso si el texto parece una narración.
NON_FICTION = frozenset({"Historia", "Ciencia", "Filosofía", "Psicología", "Autoayuda", "Educación", "Biografía"})
#: Categorías narrativas: pierden peso si el texto parece un ensayo.
FICTION = frozenset(
    {"Terror", "Fantasía", "Ciencia ficción", "Misterio", "Suspenso", "Romance", "Aventura", "Drama", "Novela histórica", "Humor"}
)

#: Aciertos por cada 1000 palabras que hacen falta para proponer una categoría.
MIN_DENSITY = 2.5
#: Una categoría secundaria debe llegar a esta fracción de la mejor.
SECONDARY_RATIO = 0.5
MAX_CATEGORIES = 3
#: Proporción de líneas con diálogo (raya o comillas) a partir de la cual el texto es narrativo.
FICTION_DIALOGUE_RATIO = 0.06

_DIALOGUE = re.compile(r"^\s*[—–«“\"'‘-]")
_SCIFI = re.compile(r"ciencia[ -]ficcion|science[ -]fiction|sci-?fi")


def _dialogue_ratio(text: str) -> float:
    lines = [line for line in text.split("\n") if line.strip()]
    if not lines:
        return 0.0
    return sum(1 for line in lines if _DIALOGUE.match(line)) / len(lines)


def detect_categories(text: str, title: str = "", hints: list[str] | None = None, year: int | None = None) -> list[str]:
    """Hasta 3 categorías de `CATEGORIAS` (la más probable primero); lista vacía si nada destaca.

    - `hints`: materia y palabras clave del PDF, donde se buscan nombres de categoría.
    - `year`: año de publicación, si se conoce (antes de 1941 se añade `Clásicos`).
    """
    combined = f"{title}\n{text}"
    words = tokenize(combined)
    folded = fold(combined)
    chosen: list[str] = []

    # 1) Lo que el propio PDF declara (materia, palabras clave) manda sobre cualquier cálculo.
    # "ciencia ficción" se reemplaza por una marca para que no cuente también como "Ciencia".
    declared = _SCIFI.sub(" cfiction ", fold(" | ".join(hints or [])))
    for categoria in CATEGORIAS:
        names = [fold(categoria), *DECLARED_ALIASES.get(categoria, [])]
        if any(name in declared for name in names):
            chosen.append(categoria)

    # 2) Densidad de palabras clave por categoría.
    if len(words) >= 200:
        narrative = _dialogue_ratio(text) >= FICTION_DIALOGUE_RATIO
        counts = Counter(words)
        scored = []
        for categoria, keys in KEYWORDS.items():
            single = tuple(key for key in keys if " " not in key)
            hits = sum(count for word, count in counts.items() if word.startswith(single)) if single else 0
            hits += sum(folded.count(fold(key)) for key in keys if " " in key)
            weight = 1.0
            if categoria in FICTION:
                weight = 1.0 if narrative else 0.35
            if categoria in NON_FICTION:
                weight = 0.35 if narrative else 1.0
            density = hits * 1000 / len(words) * weight
            if density >= MIN_DENSITY:
                scored.append((categoria, density))
        scored.sort(key=lambda item: item[1], reverse=True)

        top = scored[0][1] if scored else 0
        for categoria, density in scored:
            if density >= top * SECONDARY_RATIO and categoria not in chosen:
                chosen.append(categoria)

    if year and year <= 1940 and "Clásicos" not in chosen:
        chosen.append("Clásicos")
    return chosen[:MAX_CATEGORIES]
