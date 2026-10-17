# 0010. Subida única con preparación: lectura anticipada, portada en el servidor y avance real

- Estado: aceptado (reemplaza en parte los [ADR 0001](0001-extraccion-pdf-en-memoria.md), [0002](0002-portada-renderizada-en-el-cliente.md) y [0006](0006-autodeteccion-de-datos-del-libro.md))
- Fecha: 2026-10-17

## Contexto y problema

El tiempo de subida de un libro grande es lo que más se nota. Se midió con un PDF sintético de 119 MB y 800 páginas (texto más una imagen por página), con 4 procesos de lectura:

| Etapa | Tiempo |
|---|---|
| Extraer el texto de las 800 páginas en paralelo | 0,47 s (unas 1.700 págs/s) |
| Extraer en un solo proceso | 0,78 s |
| Recibir los 119 MB por HTTP y analizarlos (sin red real) | 0,5 s |

El servidor no es el cuello de botella; lo es mover el archivo:

1. El PDF viajaba **dos veces**: `POST /books/analyze` al elegirlo (ADR 0006) y `POST /books/upload` al enviar el formulario.
2. El navegador cargaba el PDF entero en memoria para dibujar la portada con `pdfjs` (ADR 0002).
3. El texto no se leía hasta pulsar "Subir libro", justo cuando la persona ya había esperado.
4. La subida no mostraba porcentaje.

## Opciones consideradas

- **Dejar el flujo y solo mostrar el avance de la subida.** Barato, pero no reduce el tiempo.
- **Subida por partes reanudable.** Da fiabilidad, no velocidad; queda para más adelante.
- **Preparación en el servidor (elegida).** Se sube el PDF una vez y el servidor hace todo lo demás mientras la persona rellena el formulario.

## Decisión

1. `POST /books/stage` recibe el PDF **una sola vez**, lo analiza, dibuja la portada y empieza a leer el texto en segundo plano (`backend/app/services/staged_uploads.py`). Responde con un `stageId`, el análisis y la portada; `GET /books/stage/:id` informa el avance y `DELETE` la descarta.
2. `POST /books/upload` acepta un `stage_id` en lugar del `pdf`: solo viajan los datos del libro, y el trabajo guarda el texto ya leído (o espera lo que falte, repitiendo el avance de la lectura). Sin `stage_id` el flujo anterior sigue funcionando.
3. La portada de la primera página la dibuja el servidor con PyMuPDF (`pdf_worker.render_cover`), con el mismo tope de 640×900 px y 450 KB. El navegador ya no lee el PDF y se elimina `pdfjs-dist`. El ADR 0002 había descartado el servidor por la dependencia nativa de `pdfjs` + canvas; PyMuPDF ya estaba instalado.
4. La subida se hace con `XMLHttpRequest` para mostrar el porcentaje real (`apiClient.postFormWithProgress`); después el aviso muestra las páginas leídas.
5. **Memoria:** el PDF solo se conserva en RAM mientras se extrae su texto (segundos) y se suelta al terminar. Lo que queda es el texto (hasta 15 MB) y la portada (hasta 450 KB), `STAGE_TTL_MINUTES` (20) como máximo y una preparación por usuario. La lectura respeta `UPLOAD_CONCURRENCY`. Enviar el formulario alarga la vida de la preparación; si el guardado falla (título repetido) se conserva para reenviar corregido sin volver a subir el PDF.

## Consecuencias

- El PDF viaja una vez (la mitad de transferencia) y la lectura del texto se solapa con el tiempo que la persona tarda en revisar el formulario: al pulsar "Subir libro" el guardado es casi inmediato.
- Los PDF dañados o sin texto se detectan antes de rellenar el formulario.
- El registro de preparaciones vive en el proceso, como el de cargas: se pierde al reiniciar el servidor y no funciona con varias instancias; la persona solo tendría que volver a elegir el PDF (`STAGE_NOT_FOUND`).
- Un PDF subido y luego abandonado ocupa su texto en RAM hasta caducar (20 min), con una preparación por usuario.
- El PDF sigue sin guardarse en disco ni en la base de datos.
- La subida por partes reanudable queda como mejora futura para redes inestables.

## Adenda: libros repetidos

`find_duplicate_book` considera repetido un libro con el mismo título, edición e idioma y, si el formulario trae autores, al menos un autor en común (o el registrado sin autores): así dos libros distintos con un título corriente no se bloquean entre sí. Además se guarda `hash_pdf` (SHA-256 del PDF, ya calculado al preparar) y el mismo archivo se rechaza aunque cambie el título. El formulario lo comprueba mientras se escribe (`GET /books/duplicado`) y el servidor lo vuelve a comprobar al enviar y al guardar. El PDF subido antes de existir `hash_pdf` solo se detecta por sus datos.
