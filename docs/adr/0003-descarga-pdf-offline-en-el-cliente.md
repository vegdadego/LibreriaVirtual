# 0003. Descarga en PDF y lectura sin conexión generadas en el navegador

- Estado: aceptado
- Fecha: 2026-10-14

## Contexto y problema

Como en una plataforma de música, el usuario debe poder **descargar un libro** para leerlo sin conexión, en formato PDF, y ver una sección de **libros descargados**. El servidor no conserva el PDF original: solo tiene el texto de cada página.

## Opciones consideradas

- **Generar el PDF en el servidor** (`pdfkit`) y descargarlo. Más carga y memoria en el servidor por cada descarga.
- **Generar el PDF en el navegador con `jsPDF` (elegida).**
- Guardar solo el texto y no ofrecer PDF. No cumple lo pedido.

## Decisión

1. `GET /books/:id/texto` (requiere sesión) devuelve todas las páginas en una respuesta.
2. `buildBookPdf` (`features/descargas/infrastructure/`) crea un PDF A5 con la portada y, por cada página del libro, una o más páginas con su número. Usa fuentes estándar (Latin-1): los signos tipográficos se simplifican y los caracteres fuera de Latin-1 pierden su acento o se cambian por `?`. `jsPDF` se carga con `import()` solo al descargar.
3. Lo descargado se guarda en **IndexedDB** (`libreria-offline`): metadatos, portada y PDF en `descargas`; el texto en `textos`. Las claves incluyen el id de usuario, así las cuentas de un mismo dispositivo no se mezclan.
4. `LibroConDescargasRepository` lee primero lo descargado: las páginas de un libro descargado salen de IndexedDB y la ficha usa la copia local si no hay conexión.
5. Un **service worker** (`public/sw.js`, solo en producción) guarda `index.html` y los archivos que enlaza para que la app abra sin red, y sirve de la caché el resto de archivos de la app. **La API no se cachea**. Las búsquedas en caché usan `ignoreVary` porque los servidores suelen responder `Vary: Origin` y los módulos JS llevan cabecera `Origin`.
6. "Guardar PDF" entrega el mismo archivo para guardarlo en el dispositivo.

## Consecuencias

- Positivas: el servidor no hace trabajo extra por descarga; todo funciona sin conexión incluso con el servidor apagado.
- Negativas: el PDF generado es una reproducción del texto, no del diseño del PDF original. Libros muy grandes tardan y usan memoria del navegador (se muestra el avance). Los datos locales dependen de que el navegador no limpie el almacenamiento del sitio.
- El modo sin conexión de la app solo existe en la versión compilada (`npm run build`); con `npm run dev` no hay service worker.
- Un `localStorage` borrado cierra la sesión y las descargas quedan ocultas hasta volver a iniciar sesión con la misma cuenta.
