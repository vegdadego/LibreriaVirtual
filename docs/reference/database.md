# Referencia de base de datos

MongoDB (Atlas), base `virtual_library_db`, accedida con Mongoose desde `server/src/models/`.

## Colección `books`

Modelo: [server/src/models/Book.js](../../server/src/models/Book.js).

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
| `createdAt`, `updatedAt` | Date | Automáticos. |

### Cambio: `texto` puede ser vacío

`contenido_escaneado.texto` antes era `required: true`. Mongoose trata la cadena vacía como valor ausente, así que una página en blanco (o con solo imágenes) hacía fallar el guardado y el libro perdía numeración. Ahora el campo tiene `default: ''`: un libro de 30 páginas siempre guarda sus 30 entradas, también las vacías. No se agregaron campos ni colecciones.

### Límite de tamaño

Como las páginas están dentro del documento, el libro completo no puede superar los 16 MB que MongoDB permite por documento. La carga rechaza el PDF con `CONTENT_TOO_LARGE` si el texto extraído pasa de 15 MB (un libro típico de 500 páginas ocupa unos 1–2 MB).

### Cómo se consulta

- Catálogo y detalle usan agregaciones que **excluyen** `contenido_escaneado` y calculan `total_paginas` con `$size`.
- Una página se obtiene con `$filter` sobre `contenido_escaneado`: solo ese texto viaja al servidor de la API.
- Duplicados: se busca `titulo` + `numero_edicion` + `idioma` con colación `en` de fuerza 1 (sin mayúsculas ni diacríticos; la `ñ` cuenta como `n`). No hay índice único; la protección contra cargas simultáneas vive en el registro de cargas en memoria (ver [ADR 0001](../adr/0001-extraccion-pdf-en-memoria.md)).

## Otras colecciones

`users` (`nombre_usuario`, `correo`, `password_hash`, `tipo_usuario`: `lector` | `uploader` | `admin`), `authors` (`nombre`, `biografia`, `nacionalidad`) y `sagas` (`nombre`, `descripcion`, `estado`, `libros_totales`). Sin cambios.
