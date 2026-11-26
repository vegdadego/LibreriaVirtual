# 0013. Importar libros pequeños desde el espejo de Project Gutenberg

- Estado: aceptado
- Fecha: 2026-11-26

## Contexto y problema

Se pidió añadir 358 libros de 30 a 50 páginas en español o inglés. La API solo crea libros con texto a partir de un PDF, uno por uno. La base ya tenía libros de Project Gutenberg (campo `origen`), pero el programa que los cargó no está en el repositorio.

## Opciones consideradas

- **Gutendex** (API JSON sobre Gutenberg). La instancia pública no respondió en las pruebas y pide alojar un servidor propio para uso prolongado.
- **Open Library + Internet Archive.** Filtra por páginas, pero el texto es OCR con errores, el número de páginas es el de otra edición y su API no admite descargas masivas.
- **Standard Ebooks.** El catálogo completo es para miembros y es en inglés.
- **Espejo de Project Gutenberg (elegida).** Texto plano revisado, catálogo con el tamaño de cada archivo y sin clave.
- Para guardar: **generar PDF y usar la API** (vuelve a leer un texto que ya se tiene) o **guardar con el servicio del backend (elegida)**.

## Decisión

1. `scripts/import_gutenberg.py` usa el espejo `gutenberg.pglaf.org` (nunca `www.gutenberg.org`), una descarga a la vez con 2 segundos de pausa, y se detiene ante un 403 o 429.
2. Dos pasos: `plan` (solo lee la base; deja `plan.json` y `lista.csv` para revisar) y `apply --owner --yes` (guarda esa lista).
3. El catálogo `rdf-files.tar.bz2` permite filtrar por idioma, derechos y tamaño sin descargar cada libro. Se descartan publicaciones periódicas, índices, recopilaciones de citas, tomos, partes y capítulos sueltos, el contenido para adultos (según las materias del catálogo), los libros con más de una ilustración cada dos páginas (las imágenes no se importan) y los libros que ya existen. Primero todos los de español que cumplan; el resto en inglés, por número de descargas.
4. Se quita la cabecera, la licencia, los créditos, las notas del transcriptor y toda mención a la marca (condición de Gutenberg para redistribuir sin ella). El texto se reparte en páginas de unos 1 800 caracteres (máximo 2 200), como los libros que ya había, y solo entran los que quedan entre 30 y 50.
5. Se guarda con `save_book_with_pages`: páginas en `book_pages` ([ADR 0012](0012-paginas-aparte-y-subida-por-fragmentos.md)), control de duplicados y portada en disco ([ADR 0005](0005-portadas-en-disco.md)). `origen` lleva `lote` para identificar cada carga.

## Consecuencias

- Repetir `apply` no duplica libros, y un lote se puede localizar por `origen.lote`.
- Las categorías y la sinopsis salen de reglas ([ADR 0006](0006-autodeteccion-de-datos-del-libro.md)) y pueden fallar; la sinopsis en inglés es el resumen automático de Gutenberg.
- No hay fecha de publicación ni editorial: el catálogo no las trae.
- Los libros están en dominio público **en Estados Unidos**; hay que confirmar que también lo estén donde se publique la biblioteca.
- Las portadas quedan en el disco del equipo que ejecuta `apply`.
