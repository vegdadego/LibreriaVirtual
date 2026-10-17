# 0002. Portadas: imagen subida o primera página renderizada en el navegador

- Estado: aceptado (el punto 3 de la decisión, dónde se guarda la imagen, lo reemplaza el [ADR 0005](0005-portadas-en-disco.md))
- Fecha: 2026-10-14

## Contexto y problema

La biblioteca solo muestra texto; la única imagen permitida es la portada del libro. `backendLibrary.md` dejó las portadas fuera del MVP y el servidor no guarda el PDF original. El usuario que sube el libro debe poder elegir entre **subir una imagen** o **usar la primera página del PDF**.

## Opciones consideradas

- **Renderizar la página 1 en el servidor** (`pdfjs-dist` + `@napi-rs/canvas`). El cliente no hace nada, pero añade una dependencia nativa pesada y más CPU/RAM en el servidor.
- **Guardar el PDF y generar la portada después.** Contradice la regla de no conservar el PDF.
- **Renderizar en el navegador (elegida).** El PDF ya está en el navegador al elegirlo; `pdfjs-dist` dibuja la página 1 en un `<canvas>` y la envía como JPEG.

## Decisión

1. El frontend prepara siempre un **JPEG de máximo 640×900 px y 450 KB** (`src/services/pdf/coverImage.js`), tanto si viene de una imagen subida como de la primera página. Muestra una vista previa antes de enviar. `pdfjs-dist` se carga con `import()` solo cuando hace falta.
2. `POST /books/upload` acepta un campo opcional `portada` (multipart). El servidor **valida el formato real** por los primeros bytes (JPEG, PNG o WebP) y rechaza más de **512 KB**.
3. La imagen se guarda en `Book.portada { data: Buffer, mime }` dentro del mismo documento. Las consultas de catálogo la **excluyen** y devuelven `tiene_portada`; se sirve con `GET /books/:id/portada` y caché de un día.
4. Sin portada, la interfaz dibuja una tapa de color con el título.

## Consecuencias

- Positivas: ninguna dependencia nueva en el servidor y la portada se ve igual que la vio quien subió el libro.
- El tope de 512 KB deja margen bajo los 16 MB de MongoDB junto al texto (máx. 15 MB).
- Un cliente que llame a la API directamente puede enviar cualquier PNG/JPEG/WebP de hasta 512 KB; no se re-codifica en el servidor.
- Un PDF protegido con contraseña no puede dar portada; el usuario puede elegir otra opción.
