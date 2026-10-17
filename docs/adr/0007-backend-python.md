# 0007. Backend en Python (FastAPI) con PyMuPDF como motor de lectura de PDF

- Estado: aceptado (reemplaza los puntos 1 y 2 del [ADR 0001](0001-extraccion-pdf-en-memoria.md))
- Fecha: 2026-10-15

## Contexto y problema

Se pidió que **todo el backend sea Python**; el framework y el hosting son libres. Hasta ahora era Node (Express + Mongoose + pdf.js). También se pidió que la API **escanee (lea) los PDF lo más rápido posible**; el alcance elegido es "solo texto, lo más rápido" (sin OCR).

## Opciones consideradas

Sobre el camino:
- **Volver a un commit anterior con git.** Solo habría quitado el login y la base de datos (todo el trabajo reciente no estaba commiteado) y no daba un backend Python. Descartada.
- **Traspasar el backend actual a Python (elegida).** El frontend solo conoce la API por HTTP/JSON, que ya estaba documentada y probada (41 pruebas).

Sobre el motor de lectura, medido con `backend/scripts/bench_extractors.py` (PDF sintético de 300 páginas, 2,2 MB, 2 003 párrafos; mejor de 3 vueltas, en un proceso):

| Motor | ms/página | Párrafos conservados |
|---|---|---|
| PyMuPDF `blocks` (elegido) | 0,8 | 2 003 (todos) |
| PyMuPDF `text` | 0,8 | 300 (solo páginas) |
| PyMuPDF `words` + huecos | 1,2 | 2 003 |
| PyMuPDF `dict` + huecos | 1,2 | 2 003 |
| pypdfium2 `text` | 1,0 | 300 |
| pdf.js (backend Node anterior) | 3,8 | 2 003 |
| pypdf | 8,0 | 300 |

PyMuPDF en modo `blocks` es el más rápido **y** conserva los párrafos (cada bloque de MuPDF es un párrafo; se separan con una línea en blanco, igual que antes). Los motores que no conservan párrafos habrían obligado a reconstruirlos y a perder velocidad.

Sobre el framework: **FastAPI** (Starlette + uvicorn, asíncrono) con `orjson` para las respuestas y `pymongo.AsyncMongoClient` (Motor está en desuso).

## Decisión

1. Backend en `backend/` con FastAPI. **Mismo contrato HTTP** (`docs/reference/api.md`), mismas colecciones y esquema de MongoDB, mismos tokens JWT HS256 (misma `JWT_SECRET`) y contraseñas bcrypt: los datos de Atlas, los usuarios y las sesiones abiertas siguen valiendo, y el frontend no cambia.
2. **Lectura de PDF en un pool de procesos** persistente (calentado al arrancar), para no bloquear el servidor y aprovechar varios núcleos:
   - un PDF pequeño (< `PDF_PARALLEL_MIN_PAGES`, 120) se lee entero en una sola llamada;
   - uno grande se copia **una vez a memoria compartida** y se reparte en bloques de páginas que leen procesos distintos a la vez (MuPDF abre el PDF directamente desde el buffer compartido, sin copiarlo ni enviarlo por tuberías); el progreso se actualiza por bloque;
   - los procesos del pool se apagan solos si el servidor muere de golpe.
3. Mismos límites y errores (`FILE_TOO_LARGE`, `CORRUPT_PDF`, `NO_EXTRACTABLE_TEXT`, `TOO_MANY_PAGES`, `CONTENT_TOO_LARGE`...). La lectura de metadatos y las reglas de autodetección (ADR 0006) se portaron una a una con el paquete `regex` (el módulo `re` de Python no admite `\p{L}`).
4. El registro de cargas sigue en memoria (un solo proceso uvicorn), igual que en el ADR 0001.
5. Cambios de seguridad al portar (el backend anterior no los tenía):
   - `/users` exige rol `admin` (estaba abierto a cualquiera); crear usuarios guarda la contraseña con bcrypt (antes la guardaba sin cifrar en `password_hash`);
   - crear, editar y borrar autores y sagas exige `uploader` o `admin`;
   - el registro público solo permite `lector` y `uploader`: nadie puede darse de alta como `admin`.
6. Pruebas con **pytest** y un `mongod` temporal (el binario que ya descargó `mongodb-memory-server`, copiado a `%LOCALAPPDATA%\mongodb-binaries`; también sirve `MONGOD_BIN` o el `PATH`).

## Resultados medidos (carga real `POST /books/upload`, mismo PDF, misma base de datos)

| Páginas | Node (pdf.js) | Python (PyMuPDF + pool) | Mejora |
|---|---|---|---|
| 300 | 2 308 ms | 226 ms | 10× |
| 1 000 | 7 154 ms | 719 ms | 10× |
| 1 900 | 12 935 ms | 1 235 ms | 10× |

En un proceso aislado con memoria compartida, 1 900 páginas se leen en unos 650 ms con 8 procesos (≈ 0,35 ms/página). Además, una prueba de contrato contra el backend Node (mismos PDF, misma BD) dio respuestas idénticas en catálogo, detalle, páginas, texto, `/me`, errores y en la autodetección.

## Consecuencias

- Positivas: cumple el requisito de que el backend sea Python y lee los PDF ~10 veces más rápido, con la misma API.
- **Licencia:** PyMuPDF es AGPL (o comercial). Es aceptable para este proyecto, pero si se distribuyera el servicio habría que publicar su código bajo AGPL o comprar licencia; `pypdfium2` (permisiva, ~25 % más lento) es la alternativa.
- Cada proceso del pool ocupa unos 60 MB; por eso el valor por defecto es `min(6, CPU - 1)` (`PDF_WORKERS`).
- Los archivos grandes que recibe Starlette pueden pasar por un archivo temporal que se borra al cerrar (el ADR 0001 decía "nunca a disco"); el PDF no se conserva.
- El hosting debe poder ejecutar Python 3.11+ y necesita disco persistente para las portadas (ADR 0005).
- El OCR de PDF escaneados como imagen sigue fuera de alcance; Python lo haría posible más adelante (por ejemplo con RapidOCR o Tesseract solo cuando el PDF no trae texto).
