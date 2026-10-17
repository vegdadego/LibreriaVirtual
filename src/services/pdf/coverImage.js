/**
 * Preparación de portadas en el navegador.
 *
 * El servidor guarda la portada tal cual (máx. 512 KB), así que aquí se
 * reduce y se comprime a JPEG antes de enviarla.
 */

/** Ancho máximo de la portada generada, en píxeles. */
const MAX_WIDTH = 640;
/** Alto máximo de la portada generada, en píxeles. */
const MAX_HEIGHT = 900;
/** Peso máximo aceptado por el servidor, con margen. */
const MAX_BYTES = 450 * 1024;

/**
 * Convierte un canvas en JPEG, bajando la calidad hasta que pese menos que `MAX_BYTES`.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
async function canvasToJpeg(canvas) {
  const toBlob = (quality) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen de portada.'))),
        'image/jpeg',
        quality
      );
    });

  let blob = await toBlob(0.85);
  for (let quality = 0.7; blob.size > MAX_BYTES && quality >= 0.3; quality -= 0.15) {
    blob = await toBlob(quality);
  }
  if (blob.size > MAX_BYTES) throw new Error('La imagen de portada es demasiado pesada.');
  return blob;
}

/**
 * Dibuja una fuente sobre un canvas de fondo blanco, con el tamaño final.
 *
 * @param {CanvasImageSource} source
 * @param {number} width Ancho original.
 * @param {number} height Alto original.
 * @returns {HTMLCanvasElement}
 */
function drawScaled(source, width, height) {
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  // JPEG no tiene transparencia: se pinta fondo blanco para PNG/WebP con alfa.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Reduce una imagen elegida por el usuario y la convierte a JPEG.
 *
 * @param {File} file Imagen (JPEG, PNG o WebP).
 * @returns {Promise<Blob>} JPEG listo para enviar como portada.
 * @throws {Error} Si el archivo no es una imagen que el navegador pueda leer.
 */
export async function imageFileToCover(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('No se pudo leer la imagen. Usa un archivo JPEG, PNG o WebP.');
  }
  try {
    return await canvasToJpeg(drawScaled(bitmap, bitmap.width, bitmap.height));
  } finally {
    bitmap.close();
  }
}

/**
 * Dibuja la primera página de un PDF y la devuelve como portada JPEG.
 * `pdfjs-dist` se carga solo cuando se necesita.
 *
 * @param {File} file Archivo PDF.
 * @returns {Promise<Blob>} JPEG listo para enviar como portada.
 * @throws {Error} Si el PDF no se puede abrir o está protegido con contraseña.
 */
export async function pdfFirstPageToCover(file) {
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    throw new Error(
      error?.name === 'PasswordException'
        ? 'El PDF está protegido con contraseña.'
        : 'No se pudo abrir el PDF para generar la portada.'
    );
  }

  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_WIDTH / base.width, MAX_HEIGHT / base.height, 2);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return await canvasToJpeg(canvas);
  } finally {
    // Libera el worker; un fallo al limpiar no debe ocultar la portada ya generada.
    await task.destroy().catch(() => {});
  }
}
