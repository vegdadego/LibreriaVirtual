import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfPages, looksLikePdf } from '../src/services/pdfTextExtractor.js';
import { makeNumberedPdf, makePdf } from './helpers/makePdf.js';

test('extrae las 30 páginas en orden con acentos y párrafos', async () => {
  const progress = [];
  const started = Date.now();
  const pages = await extractPdfPages(makeNumberedPdf(30), {
    onProgress: (p) => progress.push(p.paginas_procesadas),
  });
  console.log(`  30 páginas extraídas en ${Date.now() - started} ms`);

  assert.equal(pages.length, 30);
  pages.forEach((page, i) => {
    assert.equal(page.pagina, i + 1);
    assert.equal(
      page.texto,
      `Página ${i + 1} - Capítulo único\n` +
        `Había una vez un niño en la montaña número ${i + 1}.\n\n` +
        `Segundo párrafo de la página ${i + 1}: canción, ñandú, ¿qué?`
    );
  });
  assert.deepEqual(progress.slice(0, 2), [0, 1]);
  assert.equal(progress.at(-1), 30);
});

test('conserva las páginas vacías para no perder la numeración', async () => {
  const pages = await extractPdfPages(makePdf([['uno'], [], ['tres']]));
  assert.deepEqual(pages, [
    { pagina: 1, texto: 'uno' },
    { pagina: 2, texto: '' },
    { pagina: 3, texto: 'tres' },
  ]);
});

test('rechaza un PDF dañado', async () => {
  const broken = makeNumberedPdf(3).subarray(0, 120);
  await assert.rejects(extractPdfPages(broken), { code: 'CORRUPT_PDF', status: 422 });
});

test('rechaza un PDF sin texto extraíble', async () => {
  await assert.rejects(extractPdfPages(makePdf([[], []])), { code: 'NO_EXTRACTABLE_TEXT' });
});

test('rechaza un PDF con más páginas que el máximo', async () => {
  await assert.rejects(extractPdfPages(makeNumberedPdf(3), { maxPages: 2 }), {
    code: 'TOO_MANY_PAGES',
  });
});

test('rechaza cuando el texto supera el tamaño permitido', async () => {
  await assert.rejects(extractPdfPages(makeNumberedPdf(3), { maxContentBytes: 100 }), {
    code: 'CONTENT_TOO_LARGE',
  });
});

test('looksLikePdf distingue PDF de otros archivos', () => {
  assert.equal(looksLikePdf(makePdf([['x']])), true);
  assert.equal(looksLikePdf(Buffer.from('hola mundo')), false);
  assert.equal(looksLikePdf(Buffer.alloc(0)), false);
});
