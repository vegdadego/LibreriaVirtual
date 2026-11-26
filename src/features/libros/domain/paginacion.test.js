import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPorCategoria, leerPagina, rangoDePagina, totalDePaginas } from './paginacion.js';

test('cuenta las páginas, con una como mínimo', () => {
  assert.equal(totalDePaginas(640, 50), 13);
  assert.equal(totalDePaginas(600, 50), 12);
  assert.equal(totalDePaginas(0, 50), 1);
});

test('una página no válida en la URL vale 1', () => {
  assert.equal(leerPagina('3'), 3);
  for (const valor of [null, '', '0', '-2', '1.5', 'abc']) assert.equal(leerPagina(valor), 1);
});

test('da el rango de libros de cada página, también la última incompleta', () => {
  assert.deepEqual(rangoDePagina(1, 50, 640), { desde: 1, hasta: 50 });
  assert.deepEqual(rangoDePagina(13, 50, 640), { desde: 601, hasta: 640 });
});

test('agrupa por categoría, ordena por cantidad y respeta los topes', () => {
  const libro = (id, ...categorias) => ({ id, categorias });
  const grupos = agruparPorCategoria(
    [libro(1, 'Humor'), libro(2, 'Historia', 'Humor'), libro(3, 'Humor'), libro(4, 'Drama'), libro(5, 'Historia')],
    2,
    2
  );
  assert.deepEqual(
    grupos.map((g) => [g.categoria, g.libros.map((l) => l.id)]),
    [
      ['Humor', [1, 2]],
      ['Historia', [2, 5]],
    ]
  );
});
