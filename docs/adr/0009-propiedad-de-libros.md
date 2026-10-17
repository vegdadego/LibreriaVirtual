# 0009. Propiedad de los libros: cada uploader gestiona solo lo que subió

- Estado: aceptado
- Fecha: 2026-10-17

## Contexto y problema

`PUT /books/:id` y `DELETE /books/:id` solo comprobaban el rol (`uploader` o `admin`), así que cualquier uploader podía editar o eliminar los libros de otro. El libro tampoco guardaba quién lo subió, y el frontend no tenía pantalla para editar ni eliminar. Hacía falta que cada uploader gestione únicamente sus libros y una pantalla "Mis libros" para hacerlo.

## Opciones consideradas

- **Campo `subido_por` en `books` (elegida).** Cambio mínimo, se comprueba con una sola consulta y encaja con `user_books` y `folders`, que ya enlazan por ObjectId de usuario.
- **Colección aparte de propiedades.** Más flexible (varios dueños), pero añade una consulta por operación y no hay ese caso de uso.
- **Comparar contra el autor o el nombre de usuario.** Frágil: el nombre puede cambiar y el autor no es quien sube.

## Decisión

1. `books.subido_por` (ObjectId → `users`) se guarda al subir (`POST /books/upload`) o crear (`POST /books`). No viaja en las respuestas de la API (`HEAVY_FIELDS`).
2. `PUT` y `DELETE` exigen ser el dueño o `admin` (`ensure_can_manage`); si no, `403 NOT_BOOK_OWNER`. El borrado lleva el filtro de dueño en la propia operación para que permiso y borrado sean atómicos. El `admin` conserva el poder de moderar todos los libros.
3. `GET /books/mios` lista los libros propios con la misma agregación del catálogo (`catalog_page`); un admin recibe todos. `PUT` pasa a rechazar con `409 DUPLICATE_BOOK` un título, edición e idioma ya usados por otro libro, y devuelve el libro con `total_paginas` y `tiene_portada`.
4. Los libros anteriores no tienen dueño y solo los gestiona un admin hasta que `python -m scripts.assign_owner <usuario>` se lo asigne a alguien (repetible: solo toca los libros sin dueño).
5. En el frontend, "Subir libro" pasa a ser un submódulo de "Mis libros" (`/mis-libros/subir`); `/subir` redirige. Mis libros es una librería de estantes con un libro en blanco que lleva a subir, y cada libro se edita o elimina con un diálogo.

## Consecuencias

- Un uploader ya no puede borrar ni editar libros ajenos, ni por la API directa.
- Mientras no se ejecute `assign_owner`, los libros previos solo los gestiona un admin y no aparecen en la sección Mis libros de un uploader.
- Eliminar un libro lo quita para todos los usuarios (guardados, progreso y carpetas incluidos); el diálogo de confirmación lo avisa. No hay papelera.
- No hay transferencia de propiedad entre usuarios, ni varios dueños.
