# 0006. Autodetección de los datos del libro con reglas locales

- Estado: aceptado. Nota: tras el [ADR 0007](0007-backend-python.md) las reglas están en `backend/app/services/analysis/` (Python), con las mismas pruebas (`backend/tests/test_analysis.py`); la decisión no cambia.
- Fecha: 2026-10-15

## Contexto y problema

Al subir un libro había que escribir a mano autores, categorías, editorial, fecha, edición, saga, idioma y sinopsis. El usuario pidió que se detecten solos y que la sinopsis se genere automáticamente "si se puede". Redactar una sinopsis nueva requiere un modelo de lenguaje; el resto son reglas sobre los metadatos y el texto del PDF.

## Opciones consideradas

- **Híbrido:** reglas locales siempre y, si hay clave de la API de Claude, una sinopsis redactada y campos afinados.
- **Solo con Claude:** mejor calidad, pero requiere clave, cuesta por libro y envía texto del libro a un tercero.
- **Solo reglas locales (elegida por el usuario):** gratis, privado y sin configuración.

## Decisión

1. Nuevo endpoint `POST /books/analyze` (uploader/admin). Recibe el PDF, **no guarda nada** y devuelve solo lo que detectó, con `fuentes` por campo. El formulario lo llama al elegir el archivo y rellena los campos que la persona no haya editado; los marca como "Auto" y ofrece "Volver a detectar".
2. Se leen los metadatos del PDF (Info y XMP), las primeras 40 páginas y las últimas 3 (`services/bookAnalyzer.js`). Todo sucede en el servidor (`services/analysis/`), con pruebas en `test/analysis.test.js`:
   - **Idioma:** alfabeto (japonés, coreano, ruso, chino) o proporción de palabras funcionales de cada idioma latino. Manda el texto sobre el metadato del PDF, que suele traer el idioma del programa.
   - **Autores:** metadatos del PDF (descartando valores de relleno como "Administrador"); si no hay, líneas "Por X"/"Autor: X" o el titular del ©.
   - **Editorial, edición, fecha, saga:** frases de la página de créditos ("Segunda edición", "Primera edición: marzo de 2015", "Libro 2 de la saga X", "Editorial Siruela") y una lista de editoriales conocidas. Una fecha con mes solo cuenta junto a palabras como "edición" o "publicado"; no se aceptan fechas futuras.
   - **Categorías:** vocabulario por categoría (español e inglés), ajustado por si el texto es narrativo (diálogos) o ensayo, y las palabras clave que declare el PDF. Solo devuelve nombres de la lista del formulario; máximo 3.
   - **Sinopsis:** la descripción del PDF, un apartado "Sinopsis"/"Reseña" escrito en el libro, o un **resumen extractivo** (las frases más representativas del arranque, tomadas literalmente, sin diálogos ni repeticiones). Marcada como `inferido` cuando es un resumen.
3. Si el dato no aparece en una forma reconocible **no se inventa**: el campo se omite.
4. Se duplica la lista de categorías (`server/src/config/categorias.js` y la del frontend); una prueba comprueba que coincidan.

## Consecuencias

- Positivas: sin claves, costos ni envío de contenido a terceros; la persona siempre revisa antes de subir.
- La sinopsis automática **no es un resumen redactado**: son frases del propio libro y pueden no explicar de qué trata. Con un modelo de lenguaje saldría mejor; `buildSynopsis` es el punto donde enchufarlo (por ejemplo, si existe `ANTHROPIC_API_KEY`) sin cambiar el endpoint.
- La detección es por reglas: acierta cuando el libro sigue convenciones habituales y falla o calla con maquetaciones raras. Las pruebas usan PDF sintéticos; conviene ampliar las listas (editoriales, palabras clave) con libros reales.
- El PDF se envía dos veces (al analizar y al subir). Un PDF de 50 MB se transmite 2 veces; en una red lenta el análisis tarda en aparecer.
- Un PDF escaneado como imágenes no tiene texto: solo se aprovechan sus metadatos.
