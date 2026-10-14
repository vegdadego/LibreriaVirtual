import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { makeNumberedPdf, makePdf } from './helpers/makePdf.js';

process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.MAX_PDF_SIZE_MB = '1';

const { default: app } = await import('../src/app.js');
const { default: Book } = await import('../src/models/Book.js');
const { default: Author } = await import('../src/models/Author.js');
const { resetJobs } = await import('../src/services/uploadJobs.js');

let mongod;
let server;
let base;

const tokenFor = (tipo_usuario, id = new mongoose.Types.ObjectId().toHexString()) =>
  jwt.sign({ id, nombre_usuario: `user-${tipo_usuario}`, tipo_usuario }, process.env.JWT_SECRET);
const uploaderId = new mongoose.Types.ObjectId().toHexString();
const uploader = tokenFor('uploader', uploaderId);
const lector = tokenFor('lector');

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'test' });
  await Book.init();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/** Envía un PDF + metadatos a /books/upload. */
const upload = async ({ pdf, fields = {}, token = uploader, mimetype = 'application/pdf' }) => {
  const form = new FormData();
  if (pdf) form.append('pdf', new Blob([pdf], { type: mimetype }), 'libro.pdf');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const res = await fetch(`${base}/books/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

const api = async (path, { token, method = 'GET', json } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

/** Consulta el job hasta que termine (completado o error). */
const waitForJob = async (jobId, token = uploader) => {
  for (let i = 0; i < 200; i += 1) {
    const { body } = await api(`/books/uploads/${jobId}`, { token });
    if (body.data.estado === 'completado' || body.data.estado === 'error') return body.data;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('La carga no terminó a tiempo');
};

const tempPdfs = () => readdirSync(tmpdir()).filter((name) => /\.pdf$/i.test(name) || name.startsWith('multer'));

test('exige sesión y rol uploader/admin para subir, editar y borrar', async () => {
  const pdf = makeNumberedPdf(2);
  assert.equal((await upload({ pdf, fields: { titulo: 'X' }, token: null })).status, 401);
  assert.equal((await upload({ pdf, fields: { titulo: 'X' }, token: lector })).status, 403);
  assert.equal((await api('/books/uploads/abc')).status, 401);
  assert.equal((await api('/books/64b000000000000000000000', { method: 'DELETE', token: lector })).status, 403);
  assert.equal((await api('/books')).status, 200, 'la lectura del catálogo es pública');
});

test('valida archivo y metadatos antes de procesar', async () => {
  const noFile = await upload({ fields: { titulo: 'Sin archivo' } });
  assert.equal(noFile.status, 400);
  assert.equal(noFile.body.code, 'FILE_REQUIRED');

  const notPdf = await upload({ pdf: Buffer.from('esto no es un pdf'), fields: { titulo: 'Texto' } });
  assert.equal(notPdf.status, 415);
  assert.equal(notPdf.body.code, 'INVALID_FILE');

  const wrongType = await upload({ pdf: makeNumberedPdf(1), fields: { titulo: 'Tipo' }, mimetype: 'image/png' });
  assert.equal(wrongType.status, 415);

  const noTitle = await upload({ pdf: makeNumberedPdf(1), fields: { titulo: '  ' } });
  assert.equal(noTitle.status, 400);
  assert.equal(noTitle.body.code, 'INVALID_METADATA');

  const tooBig = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1.2 * 1024 * 1024)]);
  const big = await upload({ pdf: tooBig, fields: { titulo: 'Enorme' } });
  assert.equal(big.status, 413);
  assert.equal(big.body.code, 'FILE_TOO_LARGE');

  assert.equal(await Book.countDocuments(), 0);
});

test('flujo completo: subir 30 páginas, catalogar y leer página por página', async () => {
  await Author.create({ nombre: 'Gabriela Ñandú' });
  const tmpBefore = tempPdfs();

  const sent = await upload({
    pdf: makeNumberedPdf(30),
    fields: {
      titulo: 'El Libro de Prueba',
      sinopsis: 'Una historia de treinta páginas',
      categorias: 'Fantasía, Aventura',
      autores: 'gabriela nandu',
      saga: 'Sin Saga Registrada',
      numero_en_saga: '2',
      numero_edicion: '3',
      fecha_publicacion: '2020-05-01',
    },
  });
  assert.equal(sent.status, 202);
  assert.match(sent.headers.get('location'), /\/books\/uploads\//);
  assert.equal(sent.body.data.estado, 'pendiente');

  // Solo el dueño (o admin) puede ver el estado.
  const stranger = await api(`/books/uploads/${sent.body.data.jobId}`, { token: tokenFor('uploader') });
  assert.equal(stranger.status, 404);
  const asAdmin = await api(`/books/uploads/${sent.body.data.jobId}`, { token: tokenFor('admin') });
  assert.equal(asAdmin.status, 200);

  const job = await waitForJob(sent.body.data.jobId);
  assert.equal(job.estado, 'completado');
  assert.deepEqual(job.progreso, { paginas_procesadas: 30, total_paginas: 30 });
  assert.ok(job.libro_id);
  console.log(`  procesamiento completo en ${job.duracion_ms} ms`);

  // Catálogo: sin texto de páginas y con total_paginas.
  const list = await api('/books');
  assert.equal(list.body.total, 1);
  const [item] = list.body.data;
  assert.equal(item.total_paginas, 30);
  assert.equal('contenido_escaneado' in item, false);
  assert.deepEqual(item.categorias, ['Fantasía', 'Aventura']);
  assert.equal(item.numero_edicion, 3);
  assert.equal(item.saga.nombre_saga, 'Sin Saga Registrada');
  assert.equal(item.saga.numero_en_saga, 2);
  assert.equal(item.autores[0].nombre, 'Gabriela Ñandú', 'toma el nombre del autor registrado');
  assert.ok(item.autores[0].id_autor, 'enlaza al autor existente');

  const detail = await api(`/books/${job.libro_id}`);
  assert.equal(detail.body.data.total_paginas, 30);
  assert.equal('contenido_escaneado' in detail.body.data, false);

  // El texto completo está en la BD, sin depender del PDF.
  const stored = await Book.findById(job.libro_id).lean();
  assert.equal(stored.contenido_escaneado.length, 30);

  // Lectura página por página y navegación.
  for (let n = 1; n <= 30; n += 1) {
    const { status, body } = await api(`/books/${job.libro_id}/paginas/${n}`);
    assert.equal(status, 200);
    assert.equal(body.data.pagina, n);
    assert.equal(body.data.total_paginas, 30);
    assert.equal(body.data.anterior, n === 1 ? null : n - 1);
    assert.equal(body.data.siguiente, n === 30 ? null : n + 1);
    assert.ok(body.data.texto.startsWith(`Página ${n} - Capítulo único\n`));
    assert.ok(body.data.texto.endsWith(`canción, ñandú, ¿qué?`));
  }
  assert.equal((await api(`/books/${job.libro_id}/paginas/31`)).body.code, 'PAGE_NOT_FOUND');
  assert.equal((await api(`/books/${job.libro_id}/paginas/0`)).status, 400);
  assert.equal((await api(`/books/${job.libro_id}/paginas/abc`)).status, 400);
  assert.equal((await api('/books/no-es-un-id/paginas/1')).status, 400);
  assert.equal((await api('/books/64b000000000000000000000/paginas/1')).status, 404);

  // Ni el PDF ni copias temporales quedan en el servidor.
  assert.deepEqual(tempPdfs(), tmpBefore);
});

test('un reintento con el mismo archivo devuelve el mismo trabajo y no duplica el libro', async () => {
  const pdf = makeNumberedPdf(3);
  const first = await upload({ pdf, fields: { titulo: 'Reintento' } });
  const retry = await upload({ pdf, fields: { titulo: 'Reintento' } });
  assert.equal(first.status, 202);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.jobId, first.body.data.jobId);

  assert.equal((await waitForJob(first.body.data.jobId)).estado, 'completado');
  assert.equal(await Book.countDocuments({ titulo: 'Reintento' }), 1);

  // Otro archivo con el mismo título/edición/idioma se rechaza como duplicado.
  const dup = await upload({ pdf: makeNumberedPdf(4), fields: { titulo: 'reintento' } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, 'DUPLICATE_BOOK');
  assert.ok(dup.body.libro_id);
  // ...pero otra edición es otro libro.
  const edition = await upload({ pdf: makeNumberedPdf(4), fields: { titulo: 'Reintento', numero_edicion: '2' } });
  assert.equal(edition.status, 202);
  assert.equal((await waitForJob(edition.body.data.jobId)).estado, 'completado');
});

test('dos cargas simultáneas del mismo título: solo una se procesa', async () => {
  const [a, b] = await Promise.all([
    upload({ pdf: makeNumberedPdf(5), fields: { titulo: 'Carrera' } }),
    upload({ pdf: makeNumberedPdf(6), fields: { titulo: 'Carrera' } }),
  ]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [202, 409]);
  const winner = a.status === 202 ? a : b;
  assert.equal((await waitForJob(winner.body.data.jobId)).estado, 'completado');
  assert.equal(await Book.countDocuments({ titulo: 'Carrera' }), 1);
});

test('guarda las páginas vacías para conservar la numeración', async () => {
  const sent = await upload({ pdf: makePdf([['primera'], [], ['tercera']]), fields: { titulo: 'Con hoja en blanco' } });
  const job = await waitForJob(sent.body.data.jobId);
  assert.equal(job.estado, 'completado');
  const blank = await api(`/books/${job.libro_id}/paginas/2`);
  assert.equal(blank.body.data.texto, '');
  assert.equal(blank.body.data.total_paginas, 3);
});

test('PDF dañado o sin texto termina en error y no deja libros', async () => {
  const before = await Book.countDocuments();
  const tmpBefore = tempPdfs();

  const corrupt = await upload({ pdf: makeNumberedPdf(3).subarray(0, 150), fields: { titulo: 'Dañado' } });
  assert.equal(corrupt.status, 202);
  const corruptJob = await waitForJob(corrupt.body.data.jobId);
  assert.equal(corruptJob.estado, 'error');
  assert.equal(corruptJob.error.code, 'CORRUPT_PDF');

  const scanned = await upload({ pdf: makePdf([[], []]), fields: { titulo: 'Escaneado' } });
  const scannedJob = await waitForJob(scanned.body.data.jobId);
  assert.equal(scannedJob.estado, 'error');
  assert.equal(scannedJob.error.code, 'NO_EXTRACTABLE_TEXT');

  assert.equal(await Book.countDocuments(), before);
  assert.deepEqual(tempPdfs(), tmpBefore);

  // Tras un error se puede reintentar el mismo título con un archivo válido.
  const retry = await upload({ pdf: makeNumberedPdf(2), fields: { titulo: 'Dañado' } });
  assert.equal(retry.status, 202);
  assert.equal((await waitForJob(retry.body.data.jobId)).estado, 'completado');
});

test('clasificación y búsqueda', async () => {
  const byCategory = await api(`/books?categoria=${encodeURIComponent('fantasia')}`);
  assert.equal(byCategory.body.total, 1, 'categoría sin distinguir mayúsculas ni acentos');
  assert.equal(byCategory.body.data[0].titulo, 'El Libro de Prueba');

  const byTitle = await api('/books?busqueda=libro%20de%20prueba');
  assert.equal(byTitle.body.total, 1);
  const byAuthor = await api('/books?autor=ñandú');
  assert.equal(byAuthor.body.total, 1);
  assert.equal((await api('/books?busqueda=zzzz-no-existe')).body.total, 0);

  // Caracteres de regex en la búsqueda se tratan como texto, no como patrón.
  const injected = await api('/books?busqueda=' + encodeURIComponent('(['));
  assert.equal(injected.status, 200);
  assert.equal(injected.body.total, 0);

  const categories = await api('/books/categorias');
  assert.deepEqual(categories.body.data, ['Aventura', 'Fantasía']);

  const paged = await api('/books?limit=2&page=2');
  assert.equal(paged.body.limit, 2);
  assert.equal(paged.body.page, 2);
  assert.equal(paged.body.data.length, 2);
  assert.ok(paged.body.total > 2);
});

test('editar solo cambia metadatos; borrar elimina el libro', async () => {
  const { body } = await api('/books?busqueda=Con%20hoja');
  const id = body.data[0]._id;

  const edited = await api(`/books/${id}`, {
    method: 'PUT',
    token: uploader,
    json: { sinopsis: 'Nueva sinopsis', contenido_escaneado: [{ pagina: 1, texto: 'hackeado' }] },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.sinopsis, 'Nueva sinopsis');
  assert.equal('contenido_escaneado' in edited.body.data, false);
  const page1 = await api(`/books/${id}/paginas/1`);
  assert.equal(page1.body.data.texto, 'primera');

  assert.equal((await api(`/books/${id}`, { method: 'DELETE', token: uploader })).status, 200);
  assert.equal((await api(`/books/${id}`)).status, 404);
});

test('rutas desconocidas y JSON inválido responden con el formato uniforme', async () => {
  const res = await fetch(`${base}/books`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${uploader}`, 'Content-Type': 'application/json' },
    body: '{roto',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'INVALID_JSON');
  resetJobs();
});
