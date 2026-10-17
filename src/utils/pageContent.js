/**
 * Interpreta el texto de una página del libro como bloques que el lector sabe dibujar:
 * prosa, listas (con viñetas o numeradas), tablas, índices con puntos guía y líneas sueltas.
 *
 * El texto guardado no tiene formato: los párrafos van separados por una línea en blanco y las
 * tablas que el servidor reconoció al leer el PDF vienen como filas `| a | b |` con una línea
 * `| --- | --- |` tras la primera. Las listas se reconocen aquí por sus viñetas o números, así
 * que también funcionan en los libros que ya estaban subidos.
 */

/** Línea de índice: título, puntos guía y número de página ("Capítulo 1 ....... 5"). */
const TOC_LINE = /^(.*?)\s*(?:\.\s*){4,}(\S{1,8})$/;
/** Promedio de caracteres por línea desde el que un párrafo se considera prosa continua. */
const PROSE_MIN_AVG_LINE = 45;
/** Viñeta (un símbolo, o un guion seguido de espacio) y el texto del elemento. */
const BULLET = /^\s*(?:[•·●▪◦○■□▶►‣⁃*]|[-–—](?=\s))\s*(\S.*)$/;
/** Numeración: `1.`, `1)`, `(1)` o una letra minúscula con paréntesis (`a)`, `(a)`), y el texto del elemento. */
const NUMBERED = /^\s*(?:\(?(\d{1,3})[.)]|\(?([a-z])\))\s+(\S.*)$/;
/** Párrafo que en el libro va en el margen de la página (lo marca el servidor al leer el PDF). */
const MARGIN_NOTE = /^\[\[margen\]\]\s*(.*)$/;
/** Título de sección que el servidor reconoció por su tamaño de letra: `[[titulo]]` (de capítulo) o `[[subtitulo]]`. */
const HEADING = /^\[\[(titulo|subtitulo)\]\]\s*(.*)$/;
/** Figura: `[[figura]]` con su pie (varias líneas) o vacío si la figura es solo una imagen. */
const FIGURE = /^\[\[figura\]\]\s*(.*)$/;
/** Segunda línea de una tabla: `| --- | :---: |`. */
const TABLE_SEPARATOR = /^\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|$/;

/**
 * Une las líneas de un párrafo en una sola, deshaciendo los guiones de fin de línea.
 *
 * @param {string[]} lines
 * @returns {string}
 */
export function joinLines(lines) {
  return lines.reduce((acc, line) => {
    if (!acc) return line;
    if (/\p{L}-$/u.test(acc) && /^\p{Ll}/u.test(line)) return acc.slice(0, -1) + line;
    return `${acc} ${line}`;
  }, '');
}

/**
 * Convierte las líneas de un párrafo con puntos guía en filas de índice.
 * Una línea sin número que precede a una fila ya iniciada es la continuación de su título.
 *
 * @param {string[]} lines
 * @returns {{ type: 'toc', intro: string[], rows: { title: string, page: string }[] }}
 */
function toTocBlock(lines) {
  const intro = [];
  const rows = [];
  let pending = [];
  for (const line of lines) {
    const match = TOC_LINE.exec(line);
    if (match) {
      rows.push({ title: joinLines([...pending, match[1]].filter(Boolean)), page: match[2] });
      pending = [];
    } else if (rows.length === 0) {
      intro.push(line);
    } else {
      pending.push(line);
    }
  }
  pending.forEach((line) => rows.push({ title: line, page: '' }));
  return { type: 'toc', intro, rows };
}

/**
 * Viñeta o número con que empieza una línea.
 *
 * @param {string} line
 * @returns {{ kind: 'bullet'|'number'|'letter', value: string, marker: string, text: string }|null}
 */
export function listMarker(line) {
  const bullet = BULLET.exec(line);
  if (bullet) return { kind: 'bullet', value: '', marker: '•', text: bullet[1].trim() };
  const numbered = NUMBERED.exec(line);
  if (!numbered) return null;
  if (numbered[1] !== undefined) {
    return { kind: 'number', value: numbered[1], marker: `${numbered[1]}.`, text: numbered[3].trim() };
  }
  return { kind: 'letter', value: numbered[2], marker: `${numbered[2]})`, text: numbered[3].trim() };
}

/**
 * Elementos de una lista si el párrafo empieza con una viñeta o un número. Las líneas siguientes
 * sin viñeta son la continuación del elemento anterior (el PDF parte las líneas largas).
 *
 * @param {string[]} lines
 * @returns {Array<{ kind: string, value: string, marker: string, text: string }>|null}
 */
function toListItems(lines) {
  if (!listMarker(lines[0])) return null;
  const items = [];
  lines.forEach((line) => {
    const marker = listMarker(line);
    if (marker) items.push({ ...marker, parts: [marker.text] });
    else items[items.length - 1].parts.push(line);
  });
  return items.map(({ parts, ...item }) => ({ ...item, text: joinLines(parts) }));
}

/**
 * Celdas de una fila `| a | b |`. Un `|` dentro de una celda va escapado como `\|`.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function splitTableRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let current = '';
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (inner[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += inner[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Tabla del párrafo si todas sus líneas son filas `| ... |` y la segunda es el separador.
 *
 * @param {string[]} lines
 * @returns {{ type: 'table', header: string[], rows: string[][] }|null}
 */
function toTableBlock(lines) {
  if (lines.length < 2 || !lines.every((line) => line.startsWith('|') && line.endsWith('|'))) return null;
  if (!TABLE_SEPARATOR.test(lines[1])) return null;
  const header = splitTableRow(lines[0]);
  const rows = lines.slice(2).map((line) => {
    const cells = splitTableRow(line);
    while (cells.length < header.length) cells.push('');
    return cells.slice(0, header.length);
  });
  return { type: 'table', header, rows };
}

/**
 * Bloque de texto corrido o de líneas sueltas, según lo largas que sean las líneas del párrafo.
 *
 * @param {string[]} lines
 * @returns {{ type: 'prose' | 'lines', text: string }}
 */
function toTextBlock(lines) {
  const average = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  return average >= PROSE_MIN_AVG_LINE
    ? { type: 'prose', text: joinLines(lines) }
    : { type: 'lines', text: lines.join('\n') };
}

/**
 * Lista con los elementos de uno o varios párrafos seguidos.
 *
 * @param {Array<{ kind: string, value: string, marker: string, text: string }>} items
 * @returns {{ type: 'list', ordered: boolean, start: number|null, letters: boolean, items: Array<{ marker: string, text: string }> }}
 */
function toListBlock(items) {
  const first = items[0];
  return {
    type: 'list',
    ordered: first.kind !== 'bullet',
    start: first.kind === 'number' ? Number(first.value) : null,
    letters: first.kind === 'letter',
    items: items.map(({ marker, text }) => ({ marker, text })),
  };
}

/**
 * Divide el texto de una página en bloques que el lector sabe dibujar.
 *
 * Tipos: `figure` (pie de una figura; vacío si es solo una imagen), `heading` (título o subtítulo de sección, `level` 1 o 2), `table` (filas `| a | b |`), `toc` (filas de índice con puntos guía), `list` (viñetas o
 * numeración; los párrafos de lista seguidos forman una sola lista, y una numeración suelta de un
 * solo elemento no cuenta como lista), `prose` (texto corrido, líneas unidas) y `lines` (créditos,
 * versos o rótulos: se respetan los saltos).
 *
 * Los rótulos que el libro pone en el margen (párrafos `[[margen]] texto`) no son bloques: se
 * guardan en `notes` del bloque que tienen al lado (el siguiente).
 *
 * @param {string} texto
 * @returns {Array<
 *   { type: 'prose' | 'lines', text: string }
 *   | { type: 'heading', level: 1 | 2, text: string }
 *   | { type: 'figure', caption: string }
 *   | { type: 'toc', intro: string[], rows: { title: string, page: string }[] }
 *   | { type: 'table', header: string[], rows: string[][] }
 *   | { type: 'list', ordered: boolean, start: number|null, letters: boolean, items: Array<{ marker: string, text: string }> }
 * >}
 */
export function parsePageBlocks(texto) {
  const paragraphs = (texto || '')
    .split(/\n{2,}/)
    .map((p) => p.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  const blocks = [];
  let notes = []; // rótulos de margen que esperan al párrafo con el que van alineados
  const push = (block) => blocks.push(notes.length ? { ...block, notes: notes.splice(0) } : block);
  let run = []; // párrafos de lista seguidos: { lines, items }
  const flushRun = () => {
    if (run.length === 0) return;
    const items = run.flatMap((entry) => entry.items);
    // Un "1. Introducción" suelto es un título, no una lista; una viñeta sola sí cuenta.
    if (items.length >= 2 || items[0].kind === 'bullet') push(toListBlock(items));
    else run.forEach((entry) => push(toTextBlock(entry.lines)));
    run = [];
  };

  paragraphs.forEach((lines) => {
    const note = lines.length === 1 ? MARGIN_NOTE.exec(lines[0]) : null;
    if (note) {
      // Un rótulo de margen no corta una lista: se queda esperando al siguiente párrafo.
      if (note[1]) notes.push(note[1]);
      return;
    }
    const figure = FIGURE.exec(lines[0]);
    if (figure) {
      flushRun();
      push({ type: 'figure', caption: joinLines([figure[1], ...lines.slice(1)].filter(Boolean)) });
      return;
    }
    const heading = lines.length === 1 ? HEADING.exec(lines[0]) : null;
    if (heading) {
      flushRun();
      if (heading[2]) push({ type: 'heading', level: heading[1] === 'titulo' ? 1 : 2, text: heading[2] });
      return;
    }
    const table = toTableBlock(lines);
    if (table) {
      flushRun();
      push(table);
    } else if (lines.some((line) => TOC_LINE.test(line))) {
      flushRun();
      push(toTocBlock(lines));
    } else {
      const items = toListItems(lines);
      if (items) {
        run.push({ lines, items });
      } else {
        flushRun();
        push(toTextBlock(lines));
      }
    }
  });
  flushRun();
  // Rótulos sin párrafo debajo: se quedan junto al último bloque.
  if (notes.length) {
    if (blocks.length) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], notes: [...(blocks[blocks.length - 1].notes || []), ...notes] };
    else blocks.push({ type: 'lines', text: '', notes });
  }
  return blocks;
}

/**
 * Los bloques de una página como párrafos de texto plano (para el PDF de descarga, que no sabe
 * dibujar tablas ni listas): cada párrafo puede llevar saltos de línea.
 *
 * @param {ReturnType<typeof parsePageBlocks>} blocks
 * @returns {string[]}
 */
export function blocksToPlainParagraphs(blocks) {
  return blocks.map((block) => {
    if (block.type === 'toc') {
      return [...block.intro, ...block.rows.map((row) => (row.page ? `${row.title} .... ${row.page}` : row.title))].join('\n');
    }
    if (block.type === 'list') {
      return block.items.map((item) => `${item.marker === '•' ? '-' : item.marker} ${item.text}`).join('\n');
    }
    if (block.type === 'table') return [block.header, ...block.rows].map((row) => row.join(' | ')).join('\n');
    if (block.type === 'figure') return block.caption || '[Figura: solo contiene una imagen]';
    return block.text;
  });
}
