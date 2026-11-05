# 0012. Páginas en su propia colección, subida del PDF por fragmentos y caracteres especiales

- Estado: aceptado (reemplaza la decisión de guardar el texto embebido en el libro del [ADR 0001](0001-extraccion-pdf-en-memoria.md)).
- Fecha: 2026-11-04

## Contexto y problema

Se pidió que la subida de un libro sea **fragmentada** para que suba más rápido y **sature menos a MongoDB**, y que al ingresar un libro se permitan **caracteres especiales**. Quien lo pidió llamó a esta metodología "singleton".

Cómo estaba:

- El navegador mandaba el PDF entero en una sola petición `multipart/form-data` y el servidor guardaba **todas las páginas dentro del documento del libro** con una única escritura. Eso tenía tres costos: una escritura grande (cuanto más largo el libro, más pesada), un tope de 16 MB por libro (`CONTENT_TOO_LARGE`) y que MongoDB cargaba el libro entero para servir una sola página del lector.
- Los metadatos no tenían restricciones explícitas, pero había dos pérdidas de caracteres: el filtro de ruido de OCR borraba **todas** las formas geométricas (`● ○ ▪ ◆ ▶ □`, las viñetas de muchos PDF) y los autores se separaban siempre por comas, así que «García Márquez, Gabriel» se partía en dos autores.

### Sobre el nombre "singleton"

*Singleton* es otra cosa: un patrón que garantiza **una sola instancia compartida** de una clase (por ejemplo, un único cliente de base de datos para todo el programa). Partir un archivo en trozos se llama **subida por fragmentos** (*chunked upload*) y escribir en MongoDB en grupos pequeños, **escritura por lotes** (*batching*). Los dos ayudan a lo que se pidió; el singleton ayuda de otra forma, y ya lo teníamos: `backend/app/db.py` abre **un solo** `AsyncMongoClient` por proceso y todas las peticiones comparten su grupo de conexiones. En este ADR se formaliza (ver decisión 4).

## Opciones consideradas

Para la base de datos:
- **GridFS** (guardar el PDF en trozos). Descartada: no se conserva el PDF, solo su texto (ADR 0001).
- **Varias páginas por documento** (cubos de N páginas). Menos documentos, pero leer una página trae todo el cubo.
- **Un documento por página en `book_pages` (elegida).** Leer una página es un `find_one` por índice; escribir es `insert_many` en lotes.

Para la red:
- Dejar el `multipart` único (lo que había).
- **Fragmentos de 4 MB con varias peticiones a la vez (elegida)**, solo para PDF de más de 4 MB; los pequeños siguen yendo de una vez porque abrir y cerrar la subida costaría dos viajes extra.

## Decisión

1. **Páginas aparte.** Nueva colección `book_pages` `{ libro, pagina, texto }` con índice único `{ libro, pagina }`. El libro guarda solo sus metadatos y `total_paginas`. `backend/app/services/book_pages.py` escribe las páginas **por lotes** de hasta 100 páginas o 2 MB, **uno tras otro** (nunca varios a la vez, para no saturar a MongoDB), y `save_book_with_pages` crea el documento del libro **al final**: mientras no existe, nadie lo ve a medias. Si algo falla, o la carga se cancela, se borran las páginas ya escritas y la portada. El tope de texto pasa de 15 MB a `MAX_CONTENT_MB` (64).
2. **Compatibilidad.** Los libros anteriores conservan `contenido_escaneado` y se siguen leyendo igual (página, texto completo, total, inicio del contenido). `python -m scripts.migrate_pages` los pasa a `book_pages` por lotes y es seguro repetirlo; con `--orphans` borra páginas sin libro (por ejemplo tras una caída entre los lotes y el libro). **No se corrió contra Atlas**: es una decisión de quien administra la base.
3. **Subida por fragmentos.** `POST /books/stage/uploads` abre la subida, `PUT .../:indice` manda cada fragmento como cuerpo binario (hasta 3 a la vez, con hasta 3 reintentos con espera creciente si falla la red o el servidor) y `POST .../complete` une el PDF y lo prepara como `POST /books/stage` (misma respuesta). El servidor reserva el archivo una vez y copia cada fragmento en su sitio; un fragmento repetido reemplaza al anterior. El cliente (`subidaFragmentada.js`) decide cuándo mandar cada trozo; `LibroApiRepository.stageInChunks` lo conecta con `apiClient.putBinary`. Cada usuario tiene una sola subida abierta y caduca a los `STAGE_TTL_MINUTES`.
4. **Un solo cliente de MongoDB (singleton).** `db.connect()` reutiliza el cliente abierto en vez de crear otro, y el grupo de conexiones está acotado (`MONGO_MAX_POOL_SIZE`, 20): muchas cargas simultáneas esperan una conexión libre, no abren más. También son únicas por proceso la cola de lectura de PDF y los registros de cargas y preparaciones.
5. **Caracteres especiales.** Los textos del libro (`clean_text`) admiten cualquier carácter imprimible —acentos, `ñ`, `¿¡«»&#+/'"`, otros alfabetos, emojis— y solo se normalizan a NFC y se quitan los caracteres de control y los sustitutos sueltos (que no se pueden codificar). Los autores se separan por `;` o salto de línea si los hay y, si no, por comas; el formulario lo indica y `Libro.autoresTexto` usa `;` cuando un nombre lleva coma. El filtro de ruido de OCR solo quita ya el carácter de reemplazo `�`, el cuadro `■` de "glifo que falta", el área de uso privado y los controles: las viñetas y símbolos se conservan.

## Resultados medidos (local, un `mongod` en esta máquina)

| Medida | Antes | Ahora |
|---|---|---|
| Leer una página de un libro de 1 500 páginas (~7,5 MB) | 12,8 ms | **2,0 ms** (6×) |
| Escribir ese libro | 51 ms, una escritura de 7,5 MB | 140 ms, 15 escrituras de ≤ 0,5 MB |
| Subir un PDF de 60 MB (`localhost`, `scripts/bench_upload.py`) | 1,5–2,0 s | 1,35–1,4 s (16 fragmentos) |

Lo que **no** se midió: el efecto sobre Atlas con latencia real ni la ganancia de subir fragmentos en paralelo por una red lenta; en `localhost` solo se nota el costo del servidor (analizar el `multipart`, copiar el archivo), y la mejora es modesta.

## Consecuencias

- Positivas: el libro ya no tiene tope de 16 MB; cada escritura es pequeña y acotada y no hay una escritura gigante; el lector pide una página y MongoDB lee solo esa; si falla un fragmento de red solo se repite ese; el cliente muestra un avance real; sin servidor de por medio no hay `multipart` que analizar ni archivo temporal para los fragmentos.
- **Escribir un libro tarda más en total** (más operaciones: 140 ms frente a 51 ms en la prueba). Se acepta a cambio de que ninguna escritura sea grande; no hay transacción: una caída del servidor justo entre los lotes y el libro deja páginas sin libro (se limpian con `--orphans`; no se ven en la API).
- Hay que correr `python -m scripts.migrate_pages` cuando se quiera tener todos los libros en el formato nuevo. Hasta entonces conviven los dos formatos, y el código de compatibilidad (`contenido_escaneado`) se podrá quitar después.
- Los registros de subidas, preparaciones y cargas siguen en memoria de un solo proceso (ADR 0001 y 0007): con varias instancias del servidor los fragmentos de una subida tendrían que llegar a la misma.
- Una subida por fragmentos reserva en RAM el tamaño del PDF desde que se abre (hasta `MAX_PDF_SIZE_MB`) y hasta que se cierra o caduca.
- Quien escriba un autor con coma sin `;` seguirá viendo dos autores (es la convención histórica); el formulario avisa.
