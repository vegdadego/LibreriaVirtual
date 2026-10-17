import { imageFileToCover } from '../../../services/pdf/coverImage';
import { blocksToPlainParagraphs, parsePageBlocks } from '../../../utils/pageContent';

/** Tamaño de página: A5 vertical, cómodo de leer en pantallas pequeñas. */
const PAGE = { width: 148, height: 210 };
const MARGIN = { x: 16, top: 18, bottom: 20 };
const FONT_SIZE = 11;
const LINE_HEIGHT = 5.4;
const PARAGRAPH_GAP = 2.6;
/** Una página del libro con mucho texto (por ejemplo, de un libro escaneado) se encoge hasta este tamaño. */
const MIN_FONT_SIZE = 6.5;
const FONT_STEP = 0.5;
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
 * Reparte el texto de una página del libro en filas ya cortadas al ancho de la hoja.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {string[]} paragraphs
 * @param {number} size Tamaño de letra en puntos; el interlineado y el hueco entre párrafos se escalan con él.
 * @param {number} textWidth Ancho útil en mm.
 * @returns {{size: number, lineHeight: number, gap: number, rows: Array<{text: string, gapBefore: boolean}>}}
 */
function layoutPage(doc, paragraphs, size, textWidth) {
  doc.setFont('times', 'normal').setFontSize(size);
  const rows = [];
  paragraphs.forEach((paragraph, i) => {
    paragraph.split('\n').forEach((rawLine, j) => {
      const lines = rawLine.trim() === '' ? [''] : doc.splitTextToSize(rawLine, textWidth);
      lines.forEach((text, k) => rows.push({ text, gapBefore: i > 0 && j === 0 && k === 0 }));
    });
  });
  const scale = size / FONT_SIZE;
  return { size, lineHeight: LINE_HEIGHT * scale, gap: PARAGRAPH_GAP * scale, rows };
}

/** Altura, en mm, que ocupan las filas de un reparto (la última línea cuenta solo su altura de letra). */
function layoutHeight({ rows, lineHeight, gap }) {
  return rows.reduce((sum, row) => sum + lineHeight + (row.gapBefore ? gap : 0), 0) - lineHeight;
}

/**
 * Elige el mayor tamaño de letra con el que toda una página del libro cabe en una sola hoja
 * del PDF, para que cada página del libro sea una página del PDF. Si ni con el tamaño mínimo
 * cabe, devuelve el reparto con ese tamaño y la página seguirá en más hojas (ver `splitRows`).
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {string[]} paragraphs
 * @param {number} textWidth
 * @returns {ReturnType<typeof layoutPage>}
 */
function fitPage(doc, paragraphs, textWidth) {
  const capacity = PAGE.height - MARGIN.bottom - MARGIN.top;
  let layout = null;
  for (let size = FONT_SIZE; size >= MIN_FONT_SIZE; size -= FONT_STEP) {
    layout = layoutPage(doc, paragraphs, size, textWidth);
    if (layoutHeight(layout) <= capacity) return layout;
  }
  return layout;
}

/**
 * Corta las filas de un reparto en bloques que caben cada uno en una hoja.
 *
 * @param {ReturnType<typeof layoutPage>} layout
 * @returns {Array<ReturnType<typeof layoutPage>['rows']>} Al menos un bloque (puede estar vacío).
 */
function splitRows({ rows, lineHeight, gap }) {
  const limit = PAGE.height - MARGIN.bottom;
  const chunks = [[]];
  let y = MARGIN.top;
  rows.forEach((row, index) => {
    const advance = row.gapBefore && chunks[chunks.length - 1].length > 0 ? gap : 0;
    if (y + advance > limit && chunks[chunks.length - 1].length > 0) {
      chunks.push([]);
      y = MARGIN.top;
    } else {
      y += advance;
    }
    chunks[chunks.length - 1].push({ ...row, index });
    y += lineHeight;
  });
  return chunks;
}

/**
 * Genera un PDF del libro a partir del texto guardado: una portada y, por cada
 * página del libro, una hoja del PDF con su número abajo (el texto se encoge para que
 * quepa; solo una página extremadamente densa ocupa más de una hoja).
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
  const drawFooter = (label) => {
    doc.setFont('times', 'italic').setFontSize(9);
    doc.text(String(label), PAGE.width / 2, PAGE.height - 10, { align: 'center' });
  };

  for (let index = 0; index < paginas.length; index += 1) {
    const { pagina, texto } = paginas[index];

    // Tablas y listas se pasan a texto plano (filas "a | b", guiones y números): el PDF no las dibuja.
    const paragraphs = blocksToPlainParagraphs(parsePageBlocks(texto))
      .map((p) => toPdfSafeText(p).trim())
      .filter(Boolean);

    // Cada página del libro es una hoja del PDF con su número al pie: el texto se encoge
    // hasta que cabe. Solo si ni así cabe, continúa en otra hoja y el pie lo indica ("9 (2/3)").
    const layout = fitPage(doc, paragraphs, textWidth);
    const chunks = splitRows(layout);

    chunks.forEach((chunk, chunkIndex) => {
      doc.addPage([PAGE.width, PAGE.height]);
      doc.setFont('times', 'normal').setFontSize(layout.size);
      let y = MARGIN.top;
      chunk.forEach((row, rowIndex) => {
        if (rowIndex > 0 && row.gapBefore) y += layout.gap;
        if (row.text) doc.text(row.text, MARGIN.x, y);
        y += layout.lineHeight;
      });
      drawFooter(chunks.length > 1 ? `${pagina} (${chunkIndex + 1}/${chunks.length})` : pagina);
    });

    onProgress?.(index + 1, paginas.length);
    if ((index + 1) % YIELD_EVERY === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return doc.output('blob');
}
