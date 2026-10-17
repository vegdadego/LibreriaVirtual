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
| `contenido_escaneado` | [{ `pagina`, `texto` }] | Texto de cada página, en orden, con `pagina` desde 1. Va embebido en el libro. |
| `portada` | { `archivo`, `mime`, `data?` } | Opcional. `archivo` es el nombre (`<id del libro>.jpg/png/webp`) de la imagen en `backend/uploads/portadas`; `mime` su formato (JPEG, PNG o WebP, hasta 512 KB, ver [ADR 0002](../adr/0002-portada-renderizada-en-el-cliente.md) y [ADR 0005](../adr/0005-portadas-en-disco.md)). `data` (Buffer) solo existe en libros anteriores, que guardaban la imagen en el documento: `python -m scripts.migrate_covers` la pasa a disco y la borra. |
| `createdAt`, `updatedAt` | Date | Automáticos. |

### Cambio: `texto` puede ser vacío

`contenido_escaneado.texto` puede ser la cadena vacía: una página en blanco (o con solo imágenes) se guarda con `texto: ""`, así un libro de 30 páginas siempre guarda sus 30 entradas y no pierde la numeración.

### Límite de tamaño

Como las páginas están dentro del documento, el libro no puede superar los 16 MB que MongoDB permite por documento. La carga rechaza el PDF con `CONTENT_TOO_LARGE` si el texto extraído pasa de 15 MB (un libro típico de 500 páginas ocupa unos 1–2 MB). La portada ya no cuenta: vive en disco; se rechaza con `COVER_TOO_LARGE` si pasa de 512 KB.

### Cómo se consulta

- Catálogo y detalle usan agregaciones que **excluyen** `contenido_escaneado` y `portada`, y calculan `total_paginas` con `$size` y `tiene_portada` según `portada.mime` (constantes en `backend/app/services/book_queries.py`).
- Una página se obtiene con `$filter` sobre `contenido_escaneado`: solo ese texto viaja al servidor de la API.
- Duplicados: se busca `titulo` + `numero_edicion` + `idioma` con colación `en` de fuerza 1 (sin mayúsculas ni diacríticos; la `ñ` cuenta como `n`). No hay índice único; la protección contra cargas simultáneas vive en el registro de cargas en memoria (ver [ADR 0001](../adr/0001-extraccion-pdf-en-memoria.md)).

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
