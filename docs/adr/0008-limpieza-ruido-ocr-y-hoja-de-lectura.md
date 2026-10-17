# 0008. Limpieza del ruido de OCR y hoja de lectura de papel

- Estado: aceptado
- Fecha: 2026-10-17

## Contexto y problema

Al leer un libro escaneado ("Inteligencia artificial", García Serrano) se veían tres problemas:

1. El índice salía desordenado: `text-align: justify` estiraba los espacios y `overflow-wrap: anywhere` partía las tiras de puntos guía.
2. Algunas páginas (sellos de biblioteca) mostraban caracteres extraños (`J^OiA`, `■`). No los produce nuestra extracción: PyMuPDF solo copia la capa de texto del PDF, que en un escaneado es el OCR de origen, y este leyó mal sellos y manchas.
3. El texto se veía gris azulado: el `p { color: var(--text-muted) }` global de `index.css` pisaba el color heredado de la hoja.

## Opciones consideradas

- **OCR propio (Tesseract/ocrmypdf) sobre las páginas de baja calidad.** Corrige letras mal leídas, pero añade una dependencia pesada y tiempo de proceso; el [ADR 0001](0001-extraccion-pdf-en-memoria.md) dejó el OCR fuera del MVP.
- **Filtrar la basura evidente al extraer (elegida).** Barato y sin dependencias; no corrige letras mal leídas.
- **Hoja que sigue el tema (oscura en modo oscuro).** Descartada: el texto claro sobre fondo oscuro, aun en marrón, no se parece a una página impresa.

## Decisión

1. `pdf_worker.clean_ocr_noise` quita glifos vacíos y las líneas que cumplen **todas** estas condiciones: tienen 60 caracteres o menos, ninguna palabra de cuatro o más letras y al menos un 15 % de símbolos casi inexistentes en prosa (`\ ^ ~ ´ ` ¨ ¬ · ¦ ¤`). Es conservador a propósito para no borrar texto legítimo (números de página, rutas, código con palabras reales). También acorta las tiras de seis o más puntos guía a cinco.
2. El lector reconoce las filas de índice (`título ....... número`) y las pinta con puntos guía; une las líneas de la prosa y respeta los saltos en listas y créditos. Esto funciona también con los libros ya subidos.
3. La hoja del lector es de papel crema con tinta oscura en ambos temas, con lomo, sombra y número de página; los tokens `--paper-*` viven en `olympus.css`.

## Consecuencias

- La limpieza del backend solo afecta a libros nuevos: el PDF no se guarda, así que los libros ya subidos conservan su texto hasta volver a subirlos. El arreglo del índice y los colores sí les llega.
- Las letras mal reconocidas por el OCR original (`UhIVERSIOAO`) se mantienen. Si hace falta corregirlas, el siguiente paso es OCR propio sobre las páginas con poca proporción de palabras reconocibles.
- Una línea corta de código con símbolos raros y sin palabras largas (por ejemplo `a ^ b`) podría descartarse; se considera un riesgo aceptable.
