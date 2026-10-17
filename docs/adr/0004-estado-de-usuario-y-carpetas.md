# 0004. Guardados, progreso de lectura y carpetas por usuario

- Estado: aceptado
- Fecha: 2026-10-14

## Contexto y problema

Faltaban: guardar libros "para ver más tarde", recordar por qué página va cada lector ("continuar leyendo") y agrupar libros en carpetas como listas de reproducción. Todo es privado de cada usuario y debe funcionar con cualquier rol (`lector`, `uploader`, `admin`).

## Opciones consideradas

- **Arreglos dentro de `User`** (`guardados`, `progreso`, `carpetas`). Simple, pero el documento de usuario crece sin límite y el progreso se actualiza muy a menudo.
- **Una colección por concepto** (guardados, progreso, carpetas). Más colecciones para pocas diferencias.
- **`user_books` (guardado + progreso) y `folders` (elegida).**

## Decisión

1. `UserBook { usuario, libro, guardado, guardado_en, pagina_actual, ultima_lectura }` con índice único `(usuario, libro)`. "Guardar" y "leer" son dos aspectos del mismo par usuario-libro, así quitar un guardado **conserva el progreso**. Las escrituras son *upserts*; ante la carrera por el índice único se reintenta una vez.
2. `Folder { usuario, nombre, descripcion, libros[] }` con nombre único por usuario (sin distinguir mayúsculas ni acentos). Límites: 100 carpetas por usuario y 500 libros por carpeta. Los libros conservan el orden de llegada y se añaden con `$addToSet`.
3. Todo cuelga de `/api/v1/me/*` y solo exige sesión. Cada consulta filtra por el usuario del token; una carpeta ajena responde `404`, no `403`, para no revelar que existe.
4. Al borrar un libro se eliminan sus `user_books` y se quita de todas las carpetas (`removeBookReferences`).
5. El frontend mantiene el estado en contextos (`MiBibliotecaProvider`, `CarpetasProvider`) con actualización inmediata y reversión si el servidor rechaza el cambio.

## Consecuencias

- Positivas: el crecimiento de datos es proporcional al uso; los listados se resuelven con índices.
- El progreso se guarda con 800 ms de retraso mientras se hojea, y abrir un libro lo registra en la página 1 (aparece en "Continuar leyendo").
- No hay transacciones entre `books` y estas colecciones; la limpieza al borrar un libro puede dejar referencias momentáneas si el servidor cae justo entonces (se omiten al listar porque el libro ya no existe).
