# Referencia de la API

Base: `http://localhost:8000/api/v1` (ver `VITE_API_BASE_URL`). Todas las respuestas son JSON. El backend es FastAPI: la documentación interactiva (Swagger) está en `http://localhost:8000/docs`.

- **Éxito:** `{ "success": true, "data": ..., ... }`
- **Error:** `{ "success": false, "code": "CODIGO_ESTABLE", "message": "Texto para el usuario" }`, a veces con campos extra (por ejemplo `libro_id`).

## Autenticación

Las rutas marcadas con 🔒 exigen `Authorization: Bearer <token>` (el token que devuelve `POST /auth/login`) y que `tipo_usuario` sea `uploader` o `admin`. Sin token → `401`; con otro rol → `403`. La lectura del catálogo, de las páginas y de las portadas es pública.

Las marcadas con 🔒 dueño además exigen ser **quien subió el libro** (`subido_por`) o `admin`; si no, `403 NOT_BOOK_OWNER`. Un libro anterior a ese campo no tiene dueño y solo lo gestiona un `admin` (ver [ADR 0009](../adr/0009-propiedad-de-libros.md)).

Las rutas marcadas con 🔑 y todas las de `/me/*` exigen sesión con **cualquier rol**; `/me/*` solo toca datos del usuario del token.

## Endpoints

| Método y ruta | Auth | Descripción |
|---|---|---|
| `POST /books/analyze` | 🔒 | Lee un PDF y propone los datos del libro (autores, categorías, editorial, fecha, edición, saga, idioma, sinopsis). No guarda nada. |
| `POST /books/stage` | 🔒 | Sube un PDF **una sola vez**: propone los datos del libro, dibuja su portada y empieza a leer su texto. Responde `201` con un `stageId`. |
| `GET /books/duplicado` | 🔒 | Dice si el libro del formulario ya existe (`titulo`, `autores`, `numero_edicion`, `idioma` y, opcional, `stage_id` para comparar también el PDF). Responde `duplicado`: `null` o `{libro_id, titulo}`. |
| `GET /books/stage/:id` | 🔒 | Avance de la lectura del PDF preparado. Solo su dueño. |
| `DELETE /books/stage/:id` | 🔒 | Descarta un PDF preparado. |
| `POST /books/upload` | 🔒 | Guarda un libro con el `stage_id` de un PDF preparado (o, sin preparación, con el propio PDF). Responde `202` con un `jobId`. |
| `GET /books/uploads/:jobId` | 🔒 | Estado de una carga. Solo quien la inició o un `admin`. |
| `GET /books` | — | Catálogo paginado (sin texto de páginas ni imagen). |
| `GET /books/categorias` | — | Categorías en uso, ordenadas. |
| `GET /books/mios` | 🔒 | Los libros que gestiona quien consulta: los que subió él (un `admin` ve todos). Mismos filtros y paginación que `GET /books`. |
| `GET /books/:id` | — | Metadatos de un libro, `total_paginas`, `tiene_portada` e `inicio_contenido` (sin texto). |
| `GET /books/:id/portada` | — | Imagen de portada (JPEG, PNG o WebP), leída de `backend/uploads/portadas`, con caché de un día. `404 COVER_NOT_FOUND` si no tiene o el archivo ya no existe. |
| `GET /books/:id/texto` | 🔑 | Todas las páginas del libro en una respuesta (para descargar). |
| `GET /books/:id/paginas/:numero` | — | Texto de una página, con `anterior` y `siguiente`. |
| `POST /books` | 🔒 | Crea un libro solo con metadatos (JSON, sin páginas). |
| `PUT /books/:id` | 🔒 dueño | Edita metadatos (JSON). El texto no se modifica. Solo quien subió el libro o un `admin`; `409 DUPLICATE_BOOK` si otro libro ya tiene ese título, edición e idioma. Responde el libro con `total_paginas` y `tiene_portada`. |
| `DELETE /books/:id` | 🔒 dueño | Elimina el libro con todas sus páginas, su portada y sus apariciones en guardados, progreso y carpetas. Solo quien subió el libro o un `admin`. |

### `POST /books/stage`

`multipart/form-data` con el campo `pdf` (mismas reglas de tamaño y formato que la subida). Es la forma de subir un libro en el frontend: el PDF viaja **una sola vez**. El servidor lo analiza (como `POST /books/analyze`), dibuja la portada (primera página, JPEG de hasta 640×900 px y 450 KB) y empieza a leer el texto en segundo plano, de modo que cuando se envía el formulario solo falta guardarlo ([ADR 0010](../adr/0010-subida-unica-con-preparacion.md)).

Respuesta `201`:

```json
{ "success": true, "data": {
  "stageId": "0b9e…", "estado": "leyendo", "progreso": { "paginas_procesadas": 0, "total_paginas": null },
  "analisis": { "titulo": "…", "autores": ["…"], "fuentes": { "autores": "metadatos" } },
  "portada": { "mime": "image/jpeg", "base64": "/9j/4AAQ…" }
} }
```

`portada` es `null` si no se pudo dibujar. `analisis` tiene la forma de `POST /books/analyze`. Errores: los del archivo (`FILE_REQUIRED`, `INVALID_FILE`, `FILE_TOO_LARGE`) y `CORRUPT_PDF` / `PDF_ENCRYPTED` (422).

Cada usuario tiene una sola preparación: preparar otro PDF descarta la anterior. Caduca a los `STAGE_TTL_MINUTES` (20); enviar el formulario la alarga. El PDF solo se conserva en memoria hasta terminar de leer su texto.

La respuesta de `POST /books/stage` trae además `duplicado` (`null` o `{libro_id, titulo}`) si ese mismo PDF ya está en la biblioteca.

### `GET /books/stage/:id`

```json
{ "success": true, "data": { "stageId": "0b9e…", "estado": "listo", "progreso": { "paginas_procesadas": 520, "total_paginas": 520 }, "paginasSinTexto": 25 } }
```

`paginasSinTexto` (solo cuando el texto ya está leído) cuenta las páginas con menos de 25 caracteres: imágenes, hojas en blanco o con solo un número; el frontend avisa si son muchas. `estado`: `leyendo`, `listo` o `error` (con `error: { code, message }`, por ejemplo `NO_EXTRACTABLE_TEXT` o `CORRUPT_PDF`: así el problema se ve antes de rellenar el formulario). `404 STAGE_NOT_FOUND` si no existe, caducó o es de otro usuario.

### `DELETE /books/stage/:id`

Descarta la preparación. Responde `200` aunque ya no exista.

### `POST /books/analyze`

`multipart/form-data` con el campo `pdf` (mismas reglas de tamaño y formato que la subida). Responde de inmediato (no hay `jobId`): lee los metadatos del PDF, las primeras 40 páginas y las últimas 3, y devuelve **solo los campos que logró detectar**. Todo se calcula en el servidor con reglas sobre el texto, sin servicios externos ([ADR 0006](../adr/0006-autodeteccion-de-datos-del-libro.md)).

```json
{ "success": true, "data": {
  "titulo": "El Imperio de los Dragones",
  "autores": ["Ana Pérez"],
  "categorias": ["Fantasía"],
  "empresa_edicion": "Editorial Siruela",
  "fecha_publicacion": "2018-05-01",
  "fecha_precision": "mes",
  "numero_edicion": 2,
  "saga": "Crónicas del Rey",
  "numero_en_saga": 2,
  "idioma": "es",
  "sinopsis": "El joven mago cruzó el reino…",
  "fuentes": { "autores": "metadatos", "idioma": "texto", "categorias": "inferido", "sinopsis": "inferido" },
  "paginas_analizadas": 10
} }
```

- `fuentes` dice de dónde salió cada campo: `metadatos` (el propio PDF), `texto` (escrito en el libro, por ejemplo la página de créditos) o `inferido` (calculado: categorías por vocabulario, o una sinopsis hecha con frases del libro).
- `fecha_precision`: `dia`, `mes` o `anio`. Con `mes` o `anio` la fecha lleva `01` en lo que falta.
- `categorias` son siempre nombres de la lista del formulario (`backend/app/config_categorias.py`); `idioma` es un código ISO 639-1 (`es`, `en`, `pt`, `fr`, `it`, `de`, `ca`, `la`, `ja`, `ko`, `ru`, `zh`).
- Son **sugerencias**: el reconocimiento es por reglas y puede fallar o no encontrar nada. Un PDF escaneado como imagen no tiene texto que leer y devuelve solo lo que traigan sus metadatos.
- Errores: los de `/books/upload` para el archivo (`FILE_REQUIRED`, `INVALID_FILE`, `FILE_TOO_LARGE`) y `CORRUPT_PDF` / `PDF_ENCRYPTED` (422).

### `POST /books/upload`

`multipart/form-data`. No fijes `Content-Type` a mano: el navegador añade el `boundary`. En el frontend se usa `apiClient.postForm`.

| Campo | Obligatorio | Notas |
|---|---|---|
| `pdf` | Sí, o `stage_id` | Archivo PDF, hasta `MAX_PDF_SIZE_MB` (200 MB por defecto). No se envía junto con `stage_id` (`400 INVALID_UPLOAD`). |
| `stage_id` | Sí, o `pdf` | Id de un PDF preparado con `POST /books/stage`: no hay que volver a enviar el PDF; el servidor guarda el texto que ya leyó (`404 STAGE_NOT_FOUND` si caducó). Si el guardado falla (por ejemplo, título repetido) la preparación se conserva para reenviar corregido. |
| `usar_portada_pdf` | No | `1` con `stage_id`: usa la portada que dibujó el servidor. Una `portada` propia gana sobre ella. |
| `titulo` | Sí | |
| `sinopsis`, `idioma` (`es`), `empresa_edicion` | No | |
| `numero_edicion` | No | Entero ≥ 1 (1). |
| `fecha_publicacion` | No | Fecha ISO (`2020-05-01`). |
| `portada` | No | **Archivo** de imagen (JPEG, PNG o WebP, hasta 512 KB; el formato se valida por su contenido). El frontend solo la envía si la persona elige una imagen propia (reducida a JPEG en el navegador); la de la primera página del PDF la dibuja el servidor ([ADR 0010](../adr/0010-subida-unica-con-preparacion.md)). |
| `categorias`, `autores` | No | Lista: campo repetido, JSON (`["a","b"]`) o separada por comas. |
| `saga`, `numero_en_saga` | No | Nombre de la saga y posición. |

Los autores y la saga que ya existan en `authors`/`sagas` (por nombre, sin distinguir mayúsculas ni acentos) se enlazan por id. Si no existen, se guarda solo el nombre; esta ruta no crea autores ni sagas.

Respuesta `202`:

```json
{ "success": true, "data": { "jobId": "6f1c…", "estado": "pendiente", "progreso": { "paginas_procesadas": 0, "total_paginas": null } } }
```

Con cabecera `Location: /api/v1/books/uploads/<jobId>`. Si el mismo usuario reenvía el mismo archivo, responde `200` con el mismo `jobId` (no se crea otro libro).

### `GET /books/uploads/:jobId`

```json
{ "success": true, "data": {
  "jobId": "6f1c…",
  "estado": "completado",
  "progreso": { "paginas_procesadas": 30, "total_paginas": 30 },
  "libro_id": "665f…",
  "duracion_ms": 412
} }
```

`estado` pasa por `pendiente` → `procesando` → `completado` | `error`. En `error` viene `error: { code, message }`. Los datos de una carga se conservan `JOB_TTL_MINUTES` después de terminar; luego responde `404 JOB_NOT_FOUND`. El libro solo existe en el catálogo cuando `estado` es `completado`.

Ejemplo de uso:

```js
const form = new FormData();
form.append('pdf', file);
form.append('titulo', 'El Imperio Final');
form.append('categorias', 'Fantasía, Aventura');

const res = await fetch(`${API}/books/upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const { data } = await res.json();

let job;
do {
  await new Promise((r) => setTimeout(r, 1000));
  job = (await (await fetch(`${API}/books/uploads/${data.jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json()).data;
} while (job.estado === 'pendiente' || job.estado === 'procesando');
```

### `GET /books`

Query opcional: `categoria` (exacta, sin distinguir mayúsculas ni acentos), `saga`, `autor`, `busqueda` (título, sinopsis, autores y editorial; texto parcial), `page` (1) y `limit` (20, máximo 100). Los textos se tratan como texto literal, no como expresiones regulares.

```json
{ "success": true, "total": 42, "page": 1, "limit": 20, "data": [ { "_id": "665f…", "titulo": "…", "categorias": ["Fantasía"], "autores": [{ "nombre": "…" }], "total_paginas": 30 } ] }
```

`total` es el número de libros que coinciden (no el de esta página).

### `GET /books/mios` 🔒

Igual que `GET /books` (mismos parámetros y forma de respuesta), pero solo con los libros subidos por el usuario del token; para un `admin` devuelve todo el catálogo. El campo `subido_por` no viaja nunca en las respuestas de libros.

### `GET /books/:id/paginas/:numero`

```json
{ "success": true, "data": { "libro_id": "665f…", "titulo": "…", "pagina": 2, "texto": "…", "total_paginas": 30, "inicio_contenido": 8, "anterior": 1, "siguiente": 3 } }
```

`anterior` y `siguiente` son `null` en los extremos. El texto conserva saltos de línea (`\n`) y separa los párrafos con una línea en blanco (`\n\n`). Una página sin texto devuelve `"texto": ""`. Al subir el libro se descartan los glifos vacíos (`■`, `U+FFFD`), las líneas cortas que son basura de OCR (por ejemplo `J^OiA`) y las tiras de puntos guía de los índices se acortan a cinco puntos ([ADR 0008](../adr/0008-limpieza-ruido-ocr-y-hoja-de-lectura.md)). Las letras mal reconocidas por el OCR del PDF original no se corrigen.

**Tablas y listas en el texto.** Las tablas con bordes que se reconocen al leer el PDF salen como filas de texto en el lugar donde estaban, separadas del resto por una línea en blanco: `| Unidad | Horas |`, una línea `| --- | --- |` y luego las demás filas; un `|` dentro de una celda va como `\|`. Las listas no se marcan: se reconocen en el lector por sus viñetas (`•`, `-`, `*`...) o su numeración (`1.`, `1)`, `a)`), así que también valen para los libros ya subidos. Las tablas solo existen en los libros subidos después de este cambio ([ADR 0011](../adr/0011-contenido-tablas-y-listas.md)).

**`inicio_contenido`** es el número de la página donde empieza el contenido (después de la portada, los créditos, el índice y el prólogo), detectado automáticamente al subir el libro. Es `null` (o `0` en los listados) si no se detectó nada que saltar; en los libros anteriores a este campo se calcula la primera vez que se consulta y queda guardado.

### `GET /books/:id/texto` 🔑

```json
{ "success": true, "data": { "libro_id": "665f…", "titulo": "…", "total_paginas": 30, "paginas": [ { "pagina": 1, "texto": "…" } ] } }
```

Las páginas vienen ordenadas. Es para la descarga sin conexión (ver [ADR 0003](../adr/0003-descarga-pdf-offline-en-el-cliente.md)); el lector pide una página cada vez.

## Biblioteca personal (`/me`)

Todas las rutas exigen sesión (cualquier rol) y solo ven datos del usuario del token. Ver [ADR 0004](../adr/0004-estado-de-usuario-y-carpetas.md). Los libros que devuelven llevan los mismos campos que `GET /books` (sin texto ni imagen).

| Método y ruta | Descripción |
|---|---|
| `GET /me/estado` | `{ guardados: [libro_id], progreso: [{ libro_id, pagina_actual, ultima_lectura }] }`, para marcar tarjetas sin pedir cada libro. |
| `GET /me/guardados` | Libros guardados para ver más tarde, el último guardado primero. |
| `PUT /me/guardados/:bookId` | Guarda el libro (idempotente). `404 BOOK_NOT_FOUND` si no existe. |
| `DELETE /me/guardados/:bookId` | Quita el guardado (idempotente); el progreso se conserva. |
| `GET /me/progreso` | Libros que empezó a leer ("continuar leyendo"), el más reciente primero (máx. 20); cada uno trae `pagina_actual` y `ultima_lectura`. |
| `PUT /me/progreso/:bookId` | Body `{ "pagina": 12 }` (de 1 a `total_paginas`). `400 INVALID_PAGE` (con `total_paginas`) si está fuera de rango. |
| `GET /me/carpetas` | Carpetas, la modificada más recientemente primero. Cada una trae `total_libros`, `libro_ids` y `previews` (hasta 4 libros `{ _id, titulo, tiene_portada }` para el mosaico). |
| `POST /me/carpetas` | Body `{ "nombre": "…", "descripcion": "…", "libro_id": "…" }`; `descripcion` y `libro_id` son opcionales. Responde `201`. |
| `GET /me/carpetas/:id` | La carpeta con sus libros (`libros`) en el orden en que se añadieron. |
| `PUT /me/carpetas/:id` | Cambia `nombre` y/o `descripcion`. |
| `DELETE /me/carpetas/:id` | Borra la carpeta (los libros no se tocan). |
| `PUT /me/carpetas/:id/libros/:bookId` | Añade un libro (idempotente). Responde `{ carpeta_id, libro_id, total_libros }`. |
| `DELETE /me/carpetas/:id/libros/:bookId` | Quita un libro (idempotente). |

Límites: 100 carpetas por usuario, 500 libros por carpeta, nombre de hasta 80 caracteres y descripción de hasta 300. El nombre no puede repetirse entre carpetas del mismo usuario (sin distinguir mayúsculas ni acentos).

## Códigos de error

| `code` | HTTP | Cuándo |
|---|---|---|
| `UNAUTHENTICATED`, `INVALID_TOKEN` | 401 | Falta el token o es inválido/expiró. |
| `FORBIDDEN` | 403 | El rol no puede escribir. |
| `STAGE_NOT_FOUND` | 404 | El PDF preparado no existe, caducó o es de otro usuario. |
| `NOT_BOOK_OWNER` | 403 | El libro lo subió otra persona (o no tiene dueño) y el usuario no es `admin`. |
| `FILE_REQUIRED` | 400 | No se adjuntó `pdf`. |
| `INVALID_UPLOAD` | 400 | Archivos en campos distintos de `pdf` y `portada`, o más de uno por campo. |
| `INVALID_FILE` | 415 | No es un PDF. |
| `FILE_TOO_LARGE` | 413 | El PDF supera `MAX_PDF_SIZE_MB`. |
| `COVER_TOO_LARGE` | 413 | La portada supera 512 KB. |
| `INVALID_COVER` | 415 | La portada no es una imagen JPEG, PNG o WebP. |
| `INVALID_METADATA` | 400 | Falta el título o un valor no es válido. |
| `DUPLICATE_BOOK` | 409 | El libro ya existe (o se está cargando): mismo título, edición e idioma (sin distinguir mayúsculas ni acentos) y, si hay autores, al menos uno en común (o el registrado no tiene autores); o el mismo PDF (hash SHA-256). Incluye `libro_id` y `titulo` si ya existe. |
| `INVALID_ID`, `INVALID_PAGE`, `INVALID_JSON`, `VALIDATION_ERROR` | 400 | Parámetros mal formados. |
| `INVALID_FOLDER`, `FOLDER_LIMIT`, `FOLDER_FULL` | 400 | Datos de carpeta inválidos o límite alcanzado. |
| `DUPLICATE_FOLDER` | 409 | Ya tienes una carpeta con ese nombre. |
| `BOOK_NOT_FOUND`, `PAGE_NOT_FOUND`, `JOB_NOT_FOUND`, `COVER_NOT_FOUND`, `FOLDER_NOT_FOUND` | 404 | No existe (o la carpeta es de otro usuario). |
| `INTERNAL_ERROR` | 500 | Error inesperado (sin detalles internos). |

Errores que aparecen en `data.error.code` de una carga (estado `error`):

| `code` | Significado |
|---|---|
| `CORRUPT_PDF` | PDF dañado o ilegible. |
| `PDF_ENCRYPTED` | PDF protegido con contraseña. |
| `NO_EXTRACTABLE_TEXT` | Ninguna página tiene texto (PDF escaneado como imágenes; el OCR no está en el MVP). |
| `TOO_MANY_PAGES` | Más de `MAX_PDF_PAGES` páginas. |
| `CONTENT_TOO_LARGE` | El texto no cabe en un documento de MongoDB (16 MB). |
| `DUPLICATE_BOOK` | Otro libro igual se registró mientras se procesaba. |
| `STORAGE_ERROR` | Falló el guardado en la base de datos. |

## Cambios respecto a la versión anterior

- `GET /books` y `GET /books/:id` ya no devuelven `contenido_escaneado`; usar `GET /books/:id/paginas/:numero`.
- `GET /books` está paginado y su `total` cuenta todas las coincidencias.
- Nuevo: portada (`tiene_portada`, `GET /books/:id/portada` y campo `portada` en la subida), `GET /books/:id/texto` y todo `/me`.
- Nuevo: `POST /books/analyze` (autodetección de datos). Las portadas se guardan como archivos en disco y no en la base de datos; la API no cambia.
- `DELETE /books/:id` también borra los guardados y el progreso de ese libro y lo quita de las carpetas.
- `POST`, `PUT` y `DELETE` de `/books` requieren sesión de `uploader` o `admin`, y solo aceptan los campos de metadatos.
