/**
 * Genera PDF mínimos y válidos para las pruebas, sin dependencias externas.
 * Usa Helvetica con codificación WinAnsi, por lo que admite acentos y ñ.
 */

/**
 * Escapa un texto para incluirlo en una cadena literal de PDF.
 *
 * @param {string} text
 * @returns {string}
 */
const escapePdfText = (text) => text.replace(/[\\()]/g, '\\$&');

/**
 * Construye el flujo de contenido de una página. Cada elemento de `lines` es
 * una línea; una cadena vacía deja una línea en blanco (separador de párrafo).
 *
 * @param {string[]} lines
 * @returns {string}
 */
const buildContentStream = (lines) => {
  if (!lines.length) return '';
  const ops = ['BT', '/F1 12 Tf', '14 TL', '50 740 Td'];
  lines.forEach((line, index) => {
    if (index > 0) ops.push('T*');
    if (line !== '') ops.push(`(${escapePdfText(line)}) Tj`);
  });
  ops.push('ET');
  return ops.join('\n');
};

/**
 * Crea un PDF.
 *
 * @param {string[][]} pages Líneas de texto de cada página (arreglo vacío = página sin texto).
 * @returns {Buffer}
 */
export const makePdf = (pages) => {
  const objects = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  pages.forEach((lines, i) => {
    const pageId = pageIds[i];
    const stream = buildContentStream(lines);
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  const chunks = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = [];
  let position = chunks[0].length;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = position;
    const chunk = Buffer.from(`${id} 0 obj\n${objects[id]}\nendobj\n`, 'latin1');
    chunks.push(chunk);
    position += chunk.length;
  }

  const xref = ['xref', `0 ${objects.length}`, '0000000000 65535 f '];
  for (let id = 1; id < objects.length; id += 1) {
    xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `);
  }
  chunks.push(
    Buffer.from(
      `${xref.join('\n')}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`,
      'latin1'
    )
  );
  return Buffer.concat(chunks);
};

/**
 * Crea un PDF de `count` páginas con texto identificable y acentos.
 *
 * @param {number} count Número de páginas.
 * @returns {Buffer}
 */
export const makeNumberedPdf = (count) =>
  makePdf(
    Array.from({ length: count }, (_, i) => [
      `Página ${i + 1} - Capítulo único`,
      `Había una vez un niño en la montaña número ${i + 1}.`,
      '',
      `Segundo párrafo de la página ${i + 1}: canción, ñandú, ¿qué?`,
    ])
  );
