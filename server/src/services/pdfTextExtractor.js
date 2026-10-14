import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { AppError } from '../utils/AppError.js';
import { normalizeText } from '../utils/text.js';
import { getLimits } from '../config/limits.js';

/** Cabecera que identifica un PDF; puede aparecer tras algo de basura inicial. */
const PDF_SIGNATURE = '%PDF-';

/**
 * Comprueba que el buffer parezca un PDF (cabecera `%PDF-` en el primer KB).
 *
 * @param {Buffer} buffer Contenido del archivo recibido.
 * @returns {boolean}
 */
export const looksLikePdf = (buffer) =>
  buffer.length > 0 && buffer.subarray(0, 1024).includes(PDF_SIGNATURE);

/**
 * Mediana de una lista de números (0 si está vacía).
 *
 * @param {number[]} values
 * @returns {number}
 */
const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Reconstruye el texto de una página a partir de los fragmentos de pdf.js.
 *
 * Agrupa los fragmentos en líneas según su posición vertical y separa los
 * párrafos con una línea en blanco cuando el espacio entre líneas supera de
 * forma clara al interlineado habitual de la página.
 *
 * @param {Array<{str?: string, transform?: number[], height?: number}>} items Fragmentos de `getTextContent()`.
 * @returns {string} Texto de la página (cadena vacía si no hay texto).
 */
export const buildPageText = (items) => {
  const lines = [];
  let current = null;

  for (const item of items) {
    if (typeof item.str !== 'string' || !item.transform) continue;
    const y = item.transform[5];
    const height = item.height || Math.abs(item.transform[3]) || 10;
    const sameLine = current && Math.abs(current.y - y) <= height * 0.5;
    if (sameLine) {
      current.text += item.str;
      current.height = Math.max(current.height, height);
    } else {
      current = { y, height, text: item.str };
      lines.push(current);
    }
  }

  const printable = lines.filter((line) => line.text.trim() !== '');
  if (!printable.length) return '';

  const gaps = [];
  for (let i = 1; i < printable.length; i += 1) {
    const gap = printable[i - 1].y - printable[i].y;
    if (gap > 0) gaps.push(gap);
  }
  const typicalGap = gaps.length >= 3 ? median(gaps) : 0;

  let text = printable[0].text;
  for (let i = 1; i < printable.length; i += 1) {
    const gap = printable[i - 1].y - printable[i].y;
    const threshold = typicalGap
      ? typicalGap * 1.4
      : Math.max(printable[i - 1].height, printable[i].height) * 1.8;
    text += (gap > threshold ? '\n\n' : '\n') + printable[i].text;
  }
  return normalizeText(text);
};

/**
 * Traduce un error de pdf.js al error de aplicación que ve el usuario.
 *
 * @param {Error} error Error lanzado por pdf.js.
 * @returns {AppError}
 */
const toAppError = (error) => {
  if (error instanceof AppError) return error;
  if (error?.name === 'PasswordException') {
    return new AppError(422, 'PDF_ENCRYPTED', 'El PDF está protegido con contraseña.');
  }
  return new AppError(422, 'CORRUPT_PDF', 'El PDF está dañado o no se puede leer.');
};

/**
 * Extrae el texto de cada página de un PDF, en orden.
 *
 * Siempre devuelve una entrada por página (1..N), incluso si la página no
 * tiene texto. Procesa las páginas una a una para mantener acotado el uso de
 * memoria y cede el turno al event loop entre páginas.
 *
 * @param {Buffer} buffer Contenido del PDF (solo en memoria).
 * @param {object} [options]
 * @param {number} [options.maxPages] Máximo de páginas permitidas.
 * @param {number} [options.maxContentBytes] Máximo de bytes de texto acumulado.
 * @param {(progress: {paginas_procesadas: number, total_paginas: number}) => void} [options.onProgress]
 *   Se llama al terminar cada página.
 * @returns {Promise<Array<{pagina: number, texto: string}>>}
 * @throws {AppError} `CORRUPT_PDF`, `PDF_ENCRYPTED`, `TOO_MANY_PAGES`,
 *   `NO_EXTRACTABLE_TEXT` o `CONTENT_TOO_LARGE`.
 */
export const extractPdfPages = async (buffer, options = {}) => {
  const limits = getLimits();
  const maxPages = options.maxPages ?? limits.maxPdfPages;
  const maxContentBytes = options.maxContentBytes ?? limits.maxContentBytes;
  const { onProgress } = options;

  let loadingTask;
  let pdf;
  try {
    // pdf.js exige Uint8Array puro (rechaza Buffer); se usa una vista sin copiar.
    const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    loadingTask = getDocument({
      data,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });
    pdf = await loadingTask.promise;
  } catch (error) {
    await loadingTask?.destroy().catch(() => {});
    throw toAppError(error);
  }

  try {
    if (pdf.numPages > maxPages) {
      throw new AppError(
        422,
        'TOO_MANY_PAGES',
        `El PDF tiene ${pdf.numPages} páginas; el máximo permitido es ${maxPages}.`
      );
    }

    onProgress?.({ paginas_procesadas: 0, total_paginas: pdf.numPages });
    const pages = [];
    let totalBytes = 0;
    let hasText = false;

    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      let texto;
      try {
        const content = await page.getTextContent();
        texto = buildPageText(content.items);
      } finally {
        page.cleanup();
      }

      totalBytes += Buffer.byteLength(texto, 'utf8');
      if (totalBytes > maxContentBytes) {
        throw new AppError(
          422,
          'CONTENT_TOO_LARGE',
          'El texto extraído es demasiado grande para guardarse en un solo libro.'
        );
      }
      if (texto.trim() !== '') hasText = true;

      pages.push({ pagina: number, texto });
      onProgress?.({ paginas_procesadas: number, total_paginas: pdf.numPages });
      await yieldToEventLoop();
    }

    if (!hasText) {
      throw new AppError(
        422,
        'NO_EXTRACTABLE_TEXT',
        'El PDF no contiene texto extraíble (parece estar escaneado como imágenes).'
      );
    }
    return pages;
  } catch (error) {
    throw toAppError(error);
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
};
