# Referencia de base de datos

MongoDB (Atlas), base `virtual_library_db`, accedida con PyMongo (cliente asíncrono) desde `backend/app/`. El esquema no cambió con el paso del backend a Python (ver [ADR 0007](../adr/0007-backend-python.md)): las colecciones y campos de abajo son los mismos y los datos existentes siguen sirviendo. Al arrancar, `backend/app/db.py` crea los índices (únicos de `users`, `authors`, `sagas`; los de `user_books` y `folders` descritos abajo).

## Colección `books`

Esquema de la colección (sin modelo ODM; el backend en Python usa documentos y las reglas viven en `backend/app/services/book_ingest.py`).

| Campo | Tipo | Notas |
|---|---|---|
| `titulo` | String | Obligatorio. |
| `fecha_publicacion` | Date | |
| `empresa_edicion` | String | |
| `numero_edicion` | Number | Por defecto 1. |
| `sinopsis` | String | |
| `idioma` | String | Por defecto `es`. |
| `categorias` | [String] | Texto libre; no existe colección de categorías. `GET /books/categorias` devuelve las que están en uso. |
| `autores` | [{ `id_autor?`, `nombre` }] | `id_autor` se rellena si el autor existe en `authors`. |
| `saga` | { `id_saga?`, `nombre_saga`, `numero_en_saga` } | |
| `total_paginas` | Number | Cuántas páginas tiene el libro (sus textos están en la colección `book_pages`). Los libros anteriores no lo tienen: se cuentan desde `contenido_escaneado`. |
| `contenido_escaneado` | [{ `pagina`, `texto` }] | **Solo en libros anteriores al [ADR 0012](../adr/0012-paginas-aparte-y-subida-por-fragmentos.md)**, que llevaban el texto dentro del documento. Los libros nuevos no lo tienen; `python -m scripts.migrate_pages` lo pasa a `book_pages` y lo borra. Mientras tanto la API lo sigue leyendo. |
| `portada` | { `archivo`, `mime`, `data?` } | Opcional. `archivo` es el nombre (`<id del libro>.jpg/png/webp`) de la imagen en `backend/uploads/portadas`; `mime` su formato (JPEG, PNG o WebP, hasta 512 KB, ver [ADR 0002](../adr/0002-portada-renderizada-en-el-cliente.md) y [ADR 0005](../adr/0005-portadas-en-disco.md)). `data` (Buffer) solo existe en libros anteriores, que guardaban la imagen en el documento: `python -m scripts.migrate_covers` la pasa a disco y la borra. |
| `subido_por` | ObjectId → `users` | Quien subió el libro: es el único (junto con un `admin`) que puede editarlo o eliminarlo. Opcional: los libros anteriores a este campo no lo tienen; `python -m scripts.assign_owner <usuario>` se lo asigna a un usuario (ver [ADR 0009](../adr/0009-propiedad-de-libros.md)). No viaja en las respuestas de la API. Índice `{ subido_por, createdAt }`. |
| `hash_pdf` | String | SHA-256 del PDF con que se subió el libro (los anteriores no lo tienen); sirve para rechazar el mismo archivo subido otra vez. No viaja en la API. Índice disperso. |
| `inicio_contenido` | Number | Página donde empieza el contenido, tras portada, créditos, índice y prólogo (ver [ADR 0011](../adr/0011-contenido-tablas-y-listas.md)). `0` = no se detectó nada que saltar. Se calcula al subir el libro; los libros anteriores lo reciben la primera vez que se consultan (`ensure_content_start`). |
| `createdAt`, `updatedAt` | Date | Automáticos. |

### Cambio: `texto` puede ser vacío

El `texto` de una página puede ser la cadena vacía: una página en blanco (o con solo imágenes) se guarda con `texto: ""`, así un libro de 30 páginas siempre guarda sus 30 páginas y no pierde la numeración.

### Límite de tamaño

El texto ya no va dentro del libro, así que no choca con los 16 MB que MongoDB permite por documento. La carga rechaza el PDF con `CONTENT_TOO_LARGE` si el texto extraído pasa de `MAX_CONTENT_MB` (64 MB por defecto; un libro típico de 500 páginas ocupa unos 1–2 MB). La portada vive en disco; se rechaza con `COVER_TOO_LARGE` si pasa de 512 KB.

### Cómo se consulta

- Catálogo y detalle usan agregaciones que **excluyen** `contenido_escaneado` y `portada`, y toman `total_paginas` del propio libro (o, en los anteriores, el `$size` de `contenido_escaneado`) y `tiene_portada` según `portada.mime` (constantes en `backend/app/services/book_queries.py`).
- Una página se obtiene con un `find_one` por `{ libro, pagina }` en `book_pages` (índice único); en un libro anterior, con `$filter` sobre `contenido_escaneado`. Solo ese texto viaja al servidor de la API.
- Duplicados: se busca `titulo` + `numero_edicion` + `idioma` con colación `en` de fuerza 1 (sin mayúsculas ni diacríticos; la `ñ` cuenta como `n`). No hay índice único; la protección contra cargas simultáneas vive en el registro de cargas en memoria (ver [ADR 0001](../adr/0001-extraccion-pdf-en-memoria.md)).

## Colección `book_pages`

Una página de un libro por documento (ver [ADR 0012](../adr/0012-paginas-aparte-y-subida-por-fragmentos.md)). Código: `backend/app/services/book_pages.py`.

| Campo | Tipo | Notas |
|---|---|---|
| `libro` | ObjectId → `books` | El libro al que pertenece. |
| `pagina` | Number | Número de página desde 1. Índice único `{ libro, pagina }`. |
| `texto` | String | Texto de la página (puede ser `""`). |

- Se escribe **por lotes** de hasta 100 páginas o 2 MB, uno tras otro, y el documento del libro se crea al final: mientras el libro no existe nadie lo ve a medias. Si algo falla se borran las páginas ya escritas.
- Al borrar un libro se borran sus páginas. Si el servidor se cae justo entre los lotes y el libro pueden quedar páginas sin libro; `python -m scripts.migrate_pages --orphans` las limpia.

## Colección `user_books`

Documentos manejados por `backend/app/routers/me.py` y `backend/app/services/user_library.py`. Relación de un usuario con un libro (ver [ADR 0004](../adr/0004-estado-de-usuario-y-carpetas.md)).

| Campo | Tipo | Notas |
|---|---|---|
| `usuario` | ObjectId → `users` | Obligatorio. |
| `libro` | ObjectId → `books` | Obligatorio. |
| `guardado` | Boolean | `true` si lo guardó para ver más tarde. Por defecto `false`. |
| `guardado_en` | Date | Cuándo lo guardó; se borra al quitarlo. |
| `pagina_actual` | Number | Página por la que va; `0` si no ha empezado. |
| `ultima_lectura` | Date | Última vez que avanzó. |

Índices: único `(usuario, libro)`; `(usuario, guardado, guardado_en)` y `(usuario, ultima_lectura)` para los listados. Se borran al eliminar el libro.

## Colección `folders`

Documentos manejados por `backend/app/routers/me.py`. Carpeta de libros de un usuario, como una lista de reproducción.

| Campo | Tipo | Notas |
|---|---|---|
| `usuario` | ObjectId → `users` | Obligatorio. |
| `nombre` | String | Obligatorio, hasta 80 caracteres. |
| `descripcion` | String | Hasta 300 caracteres. |
| `libros` | [ObjectId → `books`] | En el orden en que se añadieron; hasta 500. |

Índices: único `(usuario, nombre)` con colación `es` de fuerza 1 (sin mayúsculas ni acentos), `(usuario, updatedAt)` y `libros`. Al eliminar un libro se quita de todas las carpetas.

## Otras colecciones

`users` (`nombre_usuario`, `correo`, `password_hash`, `tipo_usuario`: `lector` | `uploader` | `admin`), `authors` (`nombre`, `biografia`, `nacionalidad`) y `sagas` (`nombre`, `descripcion`, `estado`, `libros_totales`). Sin cambios.
