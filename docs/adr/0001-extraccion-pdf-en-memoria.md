# 0001. Extracción de PDF en memoria con cargas asíncronas

- Estado: aceptado
- Fecha: 2026-10-14

## Contexto y problema

El MVP debe recibir libros en PDF, guardar su texto por página en MongoDB y **no conservar el PDF** (`backendLibrary.md`). Debe informar un estado de procesamiento (pendiente, procesando, completado, error), no dejar libros incompletos y evitar duplicados por reintentos. El modelo `Book` ya guarda las páginas embebidas y no se quería cambiar el esquema para registrar estados.

## Opciones consideradas

- **Procesar en la petición (síncrono).** Simple, pero sin estados intermedios y con riesgo de timeout (el cliente corta a los 15 s).
- **Guardar el estado en `Book`** (`estado_procesamiento`, `hash_pdf`). Sobrevive reinicios y permite detectar duplicados por hash, pero cambia el esquema y deja libros a medias en el catálogo mientras se procesan.
- **Cargas asíncronas con registro en memoria (elegida).**

## Decisión

1. **multer con `memoryStorage`**: el PDF solo existe en RAM durante la petición y el trabajo; nunca se escribe a disco, así no hay temporales que borrar si algo falla.
2. **`pdfjs-dist` (build `legacy`)** para extraer el texto: da posición de cada fragmento, lo que permite reconstruir líneas y párrafos. Se procesa página a página y siempre se produce una entrada por página.
3. **`POST /books/upload` responde 202** con un `jobId`; el trabajo corre en una cola en memoria con concurrencia limitada (`UPLOAD_CONCURRENCY`). El frontend consulta `GET /books/uploads/:jobId`.
4. **El libro se inserta una sola vez al terminar con éxito**, en un único documento. Es atómico: nunca hay un libro parcial, y en `pendiente`/`procesando` aún no existe en el catálogo.
5. **Duplicados:** mismo usuario + mismo SHA-256 devuelve el mismo trabajo (reintento accidental); título + edición + idioma ya registrado o en proceso devuelve `409 DUPLICATE_BOOK`.
6. **Escritura solo para `uploader`/`admin`** mediante el JWT existente.

## Consecuencias

- Positivas: sin cambio de esquema (salvo permitir `texto` vacío), sin archivos que limpiar, estados claros y catálogo siempre consistente. 500 páginas de texto se extraen en unos 2 s.
- Negativas: el registro de cargas **se pierde si el servidor se reinicia** (el usuario debe volver a subir el archivo) y **no funciona con varias instancias** del backend detrás de un balanceador; la detección de duplicados entre instancias tampoco. Si se necesita, habrá que persistir los trabajos (colección aparte) o usar una cola externa.
- Un PDF de 50 MB ocupa esa RAM mientras se procesa; por eso hay un tope de tamaño y de trabajos simultáneos.
- Los PDF solo-imagen se rechazan (`NO_EXTRACTABLE_TEXT`); el OCR queda fuera del MVP.
- El documento del libro no puede pasar de 16 MB de MongoDB; se rechaza el texto que supere 15 MB.
