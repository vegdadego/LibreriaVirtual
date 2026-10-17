// Pruebas de `pageContent.js`. Se ejecutan con `npm run test:front` (node:test, sin dependencias).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blocksToPlainParagraphs, listMarker, parsePageBlocks, splitTableRow } from './pageContent.js';

test('reconoce viñetas y numeraciones, y descarta lo que no lo es', () => {
  assert.deepEqual(listMarker('• Antecedentes de la IA.'), { kind: 'bullet', value: '', marker: '•', text: 'Antecedentes de la IA.' });
  assert.equal(listMarker('- guion con espacio').kind, 'bullet');
  assert.equal(listMarker('1. Seleccionamos el nodo').value, '1');
  assert.equal(listMarker('a) segundo nivel').kind, 'letter');
  assert.equal(listMarker('-8 negativo'), null);
  assert.equal(listMarker('1.1 Sección'), null);
  assert.equal(listMarker('2020. Un año'), null);
  assert.equal(listMarker('Texto normal'), null);
});

test('las viñetas de párrafos seguidos forman una sola lista', () => {
  const blocks = parsePageBlocks('Unidad I\n\n• Antecedentes de la IA.\n\n• Conceptos básicos de la IA.\n\n• Enfoques de la IA.');
  assert.deepEqual(blocks.map((b) => b.type), ['lines', 'list']);
  assert.equal(blocks[1].items.length, 3);
  assert.equal(blocks[1].ordered, false);
});

test('una lista numerada une las líneas de continuación y los guiones de fin de línea', () => {
  const [list] = parsePageBlocks('1. Seleccionamos el nodo raíz y lo almacenamos en una lista que\ncontiene los nodos fron-\nteras.\n2. Cogemos un nodo.');
  assert.equal(list.type, 'list');
  assert.equal(list.ordered, true);
  assert.equal(list.start, 1);
  assert.equal(list.items[0].text, 'Seleccionamos el nodo raíz y lo almacenamos en una lista que contiene los nodos fronteras.');
});

test('un título numerado suelto no es una lista, una viñeta sola sí', () => {
  const blocks = parsePageBlocks('1. Introducción a la inteligencia artificial\n\nUn párrafo normal con bastante longitud para ser prosa corrida.');
  assert.deepEqual(blocks.map((b) => b.type), ['lines', 'prose']);
  assert.equal(parsePageBlocks('• Solo un elemento')[0].type, 'list');
});

test('las filas | a | b | con separador forman una tabla', () => {
  const blocks = parsePageBlocks('Contenido\n\n| Unidad | Horas |\n| --- | --- |\n| 1. Intro \\| IA | 8 |\n| Totales | 36 |');
  assert.deepEqual(blocks.map((b) => b.type), ['lines', 'table']);
  assert.deepEqual(blocks[1].header, ['Unidad', 'Horas']);
  assert.deepEqual(blocks[1].rows, [['1. Intro | IA', '8'], ['Totales', '36']]);
  assert.deepEqual(splitTableRow('| a | b\\|c | |'), ['a', 'b|c', '']);
});

test('una fila corta se completa y las barras sueltas no son una tabla', () => {
  assert.deepEqual(parsePageBlocks('| a | b | c |\n| --- | --- | --- |\n| 1 | 2 |')[0].rows, [['1', '2', '']]);
  assert.equal(parsePageBlocks('| solo una línea |')[0].type, 'lines');
  assert.notEqual(parsePageBlocks('| a |\n| b |')[0].type, 'table');
});

test('el índice con puntos guía gana a la numeración', () => {
  const [toc] = parsePageBlocks('Índice\n1. Introducción ..................... 5\n2. Conceptos ..................... 9');
  assert.equal(toc.type, 'toc');
  assert.equal(toc.rows.length, 2);
});

test('el texto plano para el PDF pone viñetas simples y filas con barras', () => {
  const plain = blocksToPlainParagraphs(parsePageBlocks('• uno\n\n• dos\n\n| A | B |\n| --- | --- |\n| 1 | 2 |'));
  assert.deepEqual(plain, ['- uno\n- dos', 'A | B\n1 | 2']);
});

test('los rótulos de margen se agrupan con el párrafo que tienen al lado', () => {
  const blocks = parsePageBlocks('Primero un párrafo largo de la página que sigue y sigue por mucho rato.\n\n[[margen]] PRUEBA DE TURING\n\n[[margen]] ROBÓTICA\n\nSegundo párrafo largo de la página que sigue y sigue por mucho rato.');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].notes, undefined);
  assert.deepEqual(blocks[1].notes, ['PRUEBA DE TURING', 'ROBÓTICA']);
});

test('los títulos de sección salen como bloques heading y respetan los rótulos de margen', () => {
  const blocks = parsePageBlocks('[[titulo]] 3.3 Búsqueda de soluciones\n\n[[margen]] ROBÓTICA\n\n[[subtitulo]] Problemas de juguete\n\nUn párrafo largo de la página que sigue y sigue por mucho rato y más.');
  assert.deepEqual(blocks.map((b) => b.type), ['heading', 'heading', 'prose']);
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[1].level, 2);
  assert.deepEqual(blocks[1].notes, ['ROBÓTICA']);
  assert.deepEqual(blocksToPlainParagraphs(blocks).slice(0, 2), ['3.3 Búsqueda de soluciones', 'Problemas de juguete']);
});

test('las figuras salen como bloque figure con su pie o vacías si son solo imagen', () => {
  const blocks = parsePageBlocks('[[figura]] Figura 1.2\nPartes de una célula consi-\nderable.\n\n[[figura]]');
  assert.deepEqual(blocks.map((b) => b.type), ['figure', 'figure']);
  assert.equal(blocks[0].caption, 'Figura 1.2 Partes de una célula considerable.');
  assert.equal(blocks[1].caption, '');
  assert.equal(blocksToPlainParagraphs(blocks)[1], '[Figura: solo contiene una imagen]');
});
