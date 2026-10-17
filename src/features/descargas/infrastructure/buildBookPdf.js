import { imageFileToCover } from '../../../services/pdf/coverImage';

/** Tamaño de página: A5 vertical, cómodo de leer en pantallas pequeñas. */
const PAGE = { width: 148, height: 210 };
const MARGIN = { x: 16, top: 18, bottom: 20 };
const FONT_SIZE = 11;
const LINE_HEIGHT = 5.4;
const PARAGRAPH_GAP = 2.6;
/** Cada cuántas páginas se cede el hilo al navegador para que no se congele. */
const YIELD_EVERY = 8;

const REPLACEMENTS = [
  [/[‘’‚′]/g, "'"],
  [/[“”„″]/g, '"'],
  [/[–—−]/g, '-'],
  [/…/g, '...'],
  [/[  -​ ⁠﻿]/g, ' '],
  [/­/g, ''],
  [/ﬁ/g, 'fi'],
  [/ﬂ/g, 'fl'],
];

/**
 * Deja solo caracteres que las fuentes estándar de PDF saben dibujar (Latin-1).
 * Los signos tipográficos se pasan a su equivalente simple y las letras con
 * otros acentos pierden la marca; lo demás se cambia por "?".
 *
 * @param {string} text
 * @returns {string}
 */
export function toPdfSafeText(text) {
  let out = String(text ?? '').replace(/\r\n?/g, '\n');
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  // Los caracteres de control (salvo salto de línea y tabulación) rompen el PDF.
  // eslint-disable-next-line no-control-regex
  out = out.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\t/g, '  ');

  return Array.from(out)
    .map((char) => {
      if (char.charCodeAt(0) <= 0xff) return char;
      const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return base.length === 1 && base.charCodeAt(0) <= 0x7f ? base : '?';
    })
    .join('');
}

/**
 * Carga un `Blob` de imagen como JPEG en data URL junto con su tamaño, para jsPDF.
 *
 * @param {Blob} blob
 * @returns {Promise<{dataUrl: string, width: number, height: number}>}
 */
async function coverToDataUrl(blob) {
  const jpeg = await imageFileToCover(blob);
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(jpeg);
  });
  const bitmap = await createImageBitmap(jpeg);
  const size = { dataUrl, width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/**
 * Genera un PDF del libro a partir del texto guardado: una portada y, por cada
 * página del libro, una o más páginas de PDF con su número abajo.
 *
 * Se hace en el navegador, así la descarga no carga al servidor y el archivo
 * queda guardado en el dispositivo.
 *
 * @param {Object} params
 * @param {string} params.titulo
 * @param {string[]} [params.autores]
 * @param {Array<{pagina: number, texto: string}>} params.paginas Texto por página, en orden.
 * @param {Blob|null} [params.portada] Imagen de portada.
 * @param {(hecho: number, total: number) => void} [params.onProgress] Avance por página.
 * @returns {Promise<Blob>} El PDF.
 */
export async function buildBookPdf({ titulo, autores = [], paginas, portada = null, onProgress }) {
  // jsPDF pesa bastante: se carga solo cuando alguien descarga un libro.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: [PAGE.width, PAGE.height], compress: true });
  doc.setProperties({ title: titulo, author: autores.join(', '), creator: 'Biblioteca Virtual' });

  const textWidth = PAGE.width - MARGIN.x * 2;

  // --- Portada ---
  let cover = null;
  if (portada) {
    try {
      cover = await coverToDataUrl(portada);
    } catch {
      cover = null; // sin portada legible se usa la página de título
    }
  }
  if (cover) {
    const scale = Math.min(PAGE.width / cover.width, PAGE.height / cover.height);
    const w = cover.width * scale;
    const h = cover.height * scale;
    doc.addImage(cover.dataUrl, 'JPEG', (PAGE.width - w) / 2, (PAGE.height - h) / 2, w, h);
  } else {
    doc.setFont('times', 'bold').setFontSize(24);
    doc.text(doc.splitTextToSize(toPdfSafeText(titulo), textWidth), PAGE.width / 2, 80, { align: 'center' });
    if (autores.length) {
      doc.setFont('times', 'normal').setFontSize(14);
      doc.text(toPdfSafeText(autores.join(', ')), PAGE.width / 2, 120, { align: 'center', maxWidth: textWidth });
    }
  }

  // --- Páginas ---
  const drawFooter = (numero) => {
    doc.setFont('times', 'italic').setFontSize(9);
    doc.text(String(numero), PAGE.width / 2, PAGE.height - 10, { align: 'center' });
  };

  for (let index = 0; index < paginas.length; index += 1) {
    const { pagina, texto } = paginas[index];
    doc.addPage([PAGE.width, PAGE.height]);
    doc.setFont('times', 'normal').setFontSize(FONT_SIZE);
    let y = MARGIN.top;

    const paragraphs = toPdfSafeText(texto)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    paragraphs.forEach((paragraph, i) => {
      if (i > 0) y += PARAGRAPH_GAP;
      paragraph.split('\n').forEach((rawLine) => {
        const lines = rawLine.trim() === '' ? [''] : doc.splitTextToSize(rawLine, textWidth);
        lines.forEach((line) => {
          if (y > PAGE.height - MARGIN.bottom) {
            drawFooter(pagina);
            doc.addPage([PAGE.width, PAGE.height]);
            doc.setFont('times', 'normal').setFontSize(FONT_SIZE);
            y = MARGIN.top;
          }
          if (line) doc.text(line, MARGIN.x, y);
          y += LINE_HEIGHT;
        });
      });
    });
    drawFooter(pagina);

    onProgress?.(index + 1, paginas.length);
    if ((index + 1) % YIELD_EVERY === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return doc.output('blob');
}
