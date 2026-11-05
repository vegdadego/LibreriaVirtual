// Pruebas de `subidaFragmentada.js`. Se ejecutan con `npm run test:front` (node:test, sin dependencias).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enviarFragmentos, esReintentable } from './subidaFragmentada.js';

const sinEspera = () => Promise.resolve();
const error = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const pausa = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

test('manda todos los fragmentos y nunca más de `paralelo` a la vez', async () => {
  let activos = 0;
  let maximo = 0;
  const enviados = [];
  await enviarFragmentos({
    total: 10,
    bytesDe: () => 100,
    paralelo: 3,
    enviar: async (indice) => {
      activos += 1;
      maximo = Math.max(maximo, activos);
      await pausa();
      enviados.push(indice);
      activos -= 1;
    },
  });
  assert.deepEqual([...enviados].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(maximo, 3);
});

test('suma el avance de todos los fragmentos y llega al total', async () => {
  const avances = [];
  await enviarFragmentos({
    total: 3,
    bytesDe: (i) => (i === 2 ? 50 : 100),
    paralelo: 2,
    onProgress: (avance) => avances.push(avance),
    enviar: async (_indice, alAvanzar) => {
      alAvanzar(10);
      await pausa();
    },
  });
  const ultimo = avances.at(-1);
  assert.deepEqual(ultimo, { cargado: 250, total: 250 });
  assert.ok(avances.every((a) => a.total === 250 && a.cargado <= 250));
});

test('repite el fragmento que falla por la red o el servidor', async () => {
  const intentos = new Map();
  await enviarFragmentos({
    total: 2,
    bytesDe: () => 10,
    espera: sinEspera,
    enviar: async (indice) => {
      intentos.set(indice, (intentos.get(indice) ?? 0) + 1);
      if (indice === 1 && intentos.get(1) < 3) throw error(intentos.get(1) === 1 ? 0 : 503);
    },
  });
  assert.equal(intentos.get(0), 1);
  assert.equal(intentos.get(1), 3);
});

test('no repite un error del cliente y deja de lanzar los fragmentos que faltan', async () => {
  const lanzados = [];
  await assert.rejects(
    enviarFragmentos({
      total: 20,
      bytesDe: () => 10,
      paralelo: 2,
      espera: sinEspera,
      enviar: async (indice) => {
        lanzados.push(indice);
        await pausa();
        if (indice === 1) throw error(400);
      },
    }),
    (e) => e.status === 400
  );
  assert.equal(lanzados.filter((i) => i === 1).length, 1, 'el 400 no se repite');
  assert.ok(lanzados.length < 20, 'no se siguieron mandando fragmentos después del fallo');
});

test('se rinde tras agotar los reintentos', async () => {
  let intentos = 0;
  await assert.rejects(
    enviarFragmentos({
      total: 1,
      bytesDe: () => 10,
      reintentos: 2,
      espera: sinEspera,
      enviar: async () => {
        intentos += 1;
        throw error(500);
      },
    }),
    (e) => e.status === 500
  );
  assert.equal(intentos, 3);
});

test('una cancelación se propaga sin reintentos', async () => {
  const controlador = new AbortController();
  let intentos = 0;
  await assert.rejects(
    enviarFragmentos({
      total: 5,
      bytesDe: () => 10,
      signal: controlador.signal,
      espera: sinEspera,
      enviar: async () => {
        intentos += 1;
        controlador.abort();
        throw error(499);
      },
    }),
    (e) => e.status === 499
  );
  assert.ok(intentos >= 1 && intentos <= 3, 'solo los que ya estaban en vuelo, sin reintentos');
});

test('qué errores se consideran reintentables', () => {
  assert.equal(esReintentable(error(0)), true);
  assert.equal(esReintentable(error(408)), true);
  assert.equal(esReintentable(error(429)), true);
  assert.equal(esReintentable(error(502)), true);
  assert.equal(esReintentable(error(400)), false);
  assert.equal(esReintentable(error(413)), false);
  assert.equal(esReintentable(error(499)), false);
  assert.equal(esReintentable(new Error('sin estado')), false);
});
