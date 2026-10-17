# 0011. Saltar al contenido, tablas y listas en el lector

- Estado: aceptado
- Fecha: 2026-10-17

## Contexto y problema

1. Los libros empiezan con portada, créditos, índice y prólogo; llegar al contenido obliga a pasar muchas páginas. Se quiere un atajo que lo detecte solo, sin saltarse nada por la fuerza al abrir.
2. El texto guardado no tiene formato, así que las tablas y las listas de los libros se leían como líneas sueltas. Las imágenes no hacen falta, pero tablas y listas sí.

## Opciones consideradas

**Inicio del contenido**
- **Usar el índice del PDF (marcadores).** Casi ningún PDF de libro los trae bien, y los escaneados no.
- **Leer la tabla de contenidos y buscar el capítulo 1.** Exige casar la numeración impresa con la del PDF (números romanos, páginas sin número): frágil.
- **Heurística sobre el texto de las primeras páginas (elegida).**

**Tablas**
- **Detectarlas siempre con `find_tables`.** En una prueba con un libro de 521 páginas costó 7,1 s (50 veces la lectura del texto, 0,14 s).
- **Detectarlas solo en páginas con dibujos vectoriales (elegida).** Consultar `get_cdrawings` cuesta 0,07 s en todo el libro; solo las páginas con 8 o más líneas o rectángulos pasan a `find_tables`. Con el mismo libro la lectura completa pasó de 0,26 s a 0,30 s.
- **Guardar una estructura aparte (JSON) por página.** Cambia el esquema y la API.

**Listas**
- **Marcarlas al leer el PDF.** Solo valdría para libros nuevos.
- **Reconocerlas en el lector por sus viñetas y números (elegida).** Vale también para los libros ya subidos.

## Decisión

1. `analysis/content_start.py` clasifica cada página de las primeras (hasta una cuarta parte del libro, entre 30 y 120) como índice (puntos guía o encabezado "Índice"/"Contenido"), preliminar (créditos, ISBN, "Prólogo", "Prefacio"...), inicio (encabezado "Capítulo 1", "Unidad I", "Introducción"), texto o vacía. El contenido empieza en el primer encabezado de inicio después de las páginas preliminares; si no lo hay, tras un hueco (página casi vacía) seguido de texto, o en la primera página con texto. Si no hay páginas preliminares no hay nada que saltar. Comprobado con tres libros reales: de 289 páginas empieza en la 10, de 26 en la 4 y de 1.241 (con 14 páginas de índice) en la 29.
2. El resultado se guarda en `books.inicio_contenido` al subir el libro (0 = nada que saltar). Los libros anteriores lo reciben la primera vez que se consulta su ficha o una página (`ensure_content_start`, una sola vez, sin tocar `updatedAt`). La API lo devuelve como `inicio_contenido` en `GET /books/:id` y en las páginas.
3. En el frontend, el detalle del libro ofrece «Ir al contenido (pág. N)» y el lector muestra el mismo botón mientras la página actual es anterior. Nunca se salta solo al abrir.
4. Las tablas con bordes se guardan dentro del texto como filas `| a | b |` con una línea `| --- | --- |` tras la primera, en el lugar donde estaban; el texto de sus celdas ya no se repite como párrafos. El análisis de datos del libro (`book_analyzer`) lee el texto sin tablas.
5. `src/utils/pageContent.js` (`parsePageBlocks`) interpreta el texto de una página: prosa, índices, **listas** (viñetas o numeración; los párrafos de lista seguidos forman una lista y las líneas de continuación se unen al elemento; un `1. Título` suelto no cuenta) y **tablas**. El lector las dibuja como `<ul>`/`<ol>` y `<table>`; el PDF de descarga las convierte en texto plano (guiones, números y filas `a | b`).

## Consecuencias

- Las tablas solo aparecen en los libros subidos desde ahora, porque el PDF no se conserva y no hay forma de recuperar las celdas del texto ya guardado. Las listas funcionan en todos.
- Solo se reconocen tablas con bordes (líneas o rectángulos); las que se alinean solo con espacios siguen saliendo como texto suelto.
- La detección del inicio es una heurística: en un libro sin encabezados ni huecos puede no encontrar nada (no hay botón) o quedarse corta (por ejemplo, empezar en un prólogo largo sin título). El botón solo sugiere, no obliga.
- Los PDF de diapositivas o escaneados tienen poco texto y la detección rinde menos.
- Una lista de elementos largos en prosa (cada línea es un párrafo que empieza con un número) se dibuja como lista, lo cual es lo esperado.

## Adenda: rótulos de margen

Los libros de texto ponen títulos cortos en una columna lateral (por ejemplo «PRUEBA DE TURING» junto al párrafo que presenta el tema). Al leer el PDF se mezclaban con el cuerpo como texto suelto. `page_text` calcula los límites de la columna del cuerpo (bloques de 150 caracteres o más) y trata como rótulo de margen todo bloque corto (90 caracteres o menos), estrecho (menos del 30 % del ancho de la página) y totalmente fuera de esa columna. Lo guarda como párrafo `[[margen]] texto`, colocado antes del párrafo con el que coincide en vertical; `parsePageBlocks` lo agrega como `notes` al bloque siguiente y el lector lo dibuja en una columna lateral. Solo se reconocen en libros subidos desde ahora, por la misma razón que las tablas (el PDF no se conserva). Los números de página y encabezados corridos que queden fuera de la columna del cuerpo también podrían tratarse como rótulos; no se ha visto en los libros probados.

## Adenda: encabezados corridos, números de página y títulos

`page_text` lee ahora los bloques con `get_text("dict")` (más rápido que `"blocks"` y da tamaño y negrita de la letra). Con la opción `structure` (activa al subir libros; el analizador de datos la apaga):
- **Se omiten** los textos cortos (80 caracteres o menos, letra de 12 pt o menos) de la franja superior o inferior (10 % del alto) que son solo un número (arábigo o romano) o llevan uno en un extremo («Introducción 3», «112 Inteligencia artificial...»). Un encabezado corrido sin número (solo el título del libro) no se detecta, porque cada página se lee sin ver las demás.
- **Títulos:** un bloque de 3 a 120 caracteres y hasta 3 líneas con letra 1,15 veces mayor que la del cuerpo (la más común de la página) se guarda como `[[subtitulo]] texto`, o `[[titulo]]` si es 1,6 veces mayor o más; también un bloque corto, todo en negrita y sin puntuación final. El lector los dibuja como `h2`/`h3`.
- **Tablas:** `find_tables` cuesta unos 60 ms por página sin importar su contenido (en el libro de Russell y Norvig, 14 s por cada 300 páginas), así que `_table_region` filtra antes: exige reglas horizontales y verticales o varias celdas con borde dibujado (los rótulos de margen con fondo gris no cuentan) y, además, devuelve el recuadro que las envuelve para pasarlo como `clip` a `find_tables`, que así analiza solo esa zona (la lectura de las 120 páginas de prueba bajó de 4,4 s a 2,2 s). El libro entero de 1.241 páginas se lee en unos 11 s con el pool de procesos, que es muy denso en tablas y figuras; en libros con pocas figuras el costo es despreciable.

Como con las tablas y los rótulos de margen, solo aplica a libros subidos desde ahora.

## Adenda: figuras

El texto que hay dentro de una figura (nombres de partes, ejes, nodos de un árbol) no es texto de la página y salía mezclado con ella. `page_text` busca las figuras (imágenes de 80×50 puntos o más y grupos de dibujos vectoriales de ese tamaño, agrupados con `_cluster_rects` sobre los dibujos que ya se leyeron para las tablas) y descarta los textos cortos (60 caracteres o menos, hasta 5 líneas, letra no mayor que la del cuerpo) que caen dentro cuando hay al menos tres; con menos se conservan, para no perder un título de cuadro. El pie de la figura («Figura N...», «Gráfico N...», junto a la figura o dentro de ella) se guarda como `[[figura]] pie`; una imagen o figura con etiquetas pero sin pie deja un `[[figura]]` vacío. El lector muestra el pie con un aviso de que la imagen no se muestra, o solo el aviso. El libro de Russell y Norvig (1.241 páginas) tarda unos 14 s con esta detección, frente a unos 11 s sin ella (medidas en un equipo con ruido). Solo aplica a libros subidos desde ahora.
