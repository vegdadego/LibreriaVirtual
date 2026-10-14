import { randomUUID } from 'node:crypto';
import { getLimits } from '../config/limits.js';
import { AppError } from '../utils/AppError.js';

/** Estados posibles de una carga. */
export const JOB_STATES = {
  PENDING: 'pendiente',
  PROCESSING: 'procesando',
  DONE: 'completado',
  ERROR: 'error',
};

/** @type {Map<string, object>} jobId -> trabajo */
const jobs = new Map();
/** @type {Map<string, string>} `${usuario}:${hash}` -> jobId (reintentos idempotentes) */
const hashIndex = new Map();
/** @type {Map<string, string>} clave de título -> jobId activo (cargas simultáneas del mismo libro) */
const titleIndex = new Map();
/** @type {object[]} */
const queue = [];
let running = 0;
let sweeper = null;

const isActive = (job) => job.estado === JOB_STATES.PENDING || job.estado === JOB_STATES.PROCESSING;

/**
 * Elimina los trabajos terminados cuyo TTL venció. Se ejecuta periódicamente.
 */
const sweepExpired = () => {
  const now = Date.now();
  for (const job of jobs.values()) {
    if (!isActive(job) && job.expira <= now) {
      jobs.delete(job.id);
      if (hashIndex.get(job.hashKey) === job.id) hashIndex.delete(job.hashKey);
    }
  }
};

const ensureSweeper = () => {
  if (sweeper) return;
  sweeper = setInterval(sweepExpired, 60_000);
  sweeper.unref();
};

/**
 * Ejecuta tareas de la cola respetando el límite de concurrencia.
 */
const drain = () => {
  const { concurrency } = getLimits();
  while (running < concurrency && queue.length) {
    const job = queue.shift();
    running += 1;
    runJob(job).finally(() => {
      running -= 1;
      drain();
    });
  }
};

/**
 * Ejecuta un trabajo y deja registrado su resultado. Al terminar (con éxito o
 * error) suelta el PDF de memoria.
 *
 * @param {object} job
 */
const runJob = async (job) => {
  job.estado = JOB_STATES.PROCESSING;
  job.inicio = Date.now();
  try {
    const result = await job.task({
      payload: job.payload,
      onProgress: (progreso) => {
        job.progreso = progreso;
      },
    });
    job.libro_id = result.libro_id;
    job.estado = JOB_STATES.DONE;
  } catch (error) {
    job.estado = JOB_STATES.ERROR;
    job.error =
      error instanceof AppError
        ? { code: error.code, message: error.message, ...error.extra }
        : { code: 'STORAGE_ERROR', message: 'No se pudo guardar el libro. Inténtalo de nuevo.' };
    if (!(error instanceof AppError)) console.error('Fallo al procesar la carga:', error);
  } finally {
    job.payload = null;
    job.task = null;
    job.duracion_ms = Date.now() - job.inicio;
    job.expira = Date.now() + getLimits().jobTtlMs;
    if (titleIndex.get(job.titleKey) === job.id) titleIndex.delete(job.titleKey);
  }
};

/**
 * Encola una carga de libro.
 *
 * Si el mismo usuario ya envió el mismo archivo (mismo hash) y esa carga no
 * falló, devuelve el trabajo existente en lugar de crear otro (reintentos
 * accidentales). Si ya hay una carga activa con el mismo título, rechaza.
 *
 * @param {object} params
 * @param {string} params.owner Id del usuario que sube el libro.
 * @param {string} params.hash SHA-256 del PDF.
 * @param {string} params.titleKey Título normalizado, para detectar cargas simultáneas.
 * @param {object} params.payload Datos que necesita la tarea (se liberan al terminar).
 * @param {(ctx: {payload: object, onProgress: Function}) => Promise<{libro_id: string}>} params.task
 *   Trabajo a ejecutar.
 * @returns {{job: object, reused: boolean}}
 * @throws {AppError} `DUPLICATE_BOOK` si ya se está procesando un libro con ese título.
 */
export const enqueueUpload = ({ owner, hash, titleKey, payload, task }) => {
  ensureSweeper();

  const hashKey = `${owner}:${hash}`;
  const existingId = hashIndex.get(hashKey);
  const existing = existingId && jobs.get(existingId);
  if (existing && existing.estado !== JOB_STATES.ERROR) {
    return { job: existing, reused: true };
  }

  if (titleIndex.has(titleKey)) {
    throw new AppError(
      409,
      'DUPLICATE_BOOK',
      'Ya se está procesando una carga de un libro con ese título.'
    );
  }

  const job = {
    id: randomUUID(),
    owner,
    hashKey,
    titleKey,
    estado: JOB_STATES.PENDING,
    progreso: { paginas_procesadas: 0, total_paginas: null },
    libro_id: null,
    error: null,
    creado: Date.now(),
    inicio: null,
    duracion_ms: null,
    expira: Infinity,
    payload,
    task,
  };
  jobs.set(job.id, job);
  hashIndex.set(hashKey, job.id);
  titleIndex.set(titleKey, job.id);
  queue.push(job);
  // Se difiere para que la respuesta a quien subió el libro refleje 'pendiente'.
  setImmediate(drain);
  return { job, reused: false };
};

/**
 * Busca un trabajo por id.
 *
 * @param {string} id
 * @returns {object|undefined} El trabajo, o `undefined` si no existe o expiró.
 */
export const getJob = (id) => {
  const job = jobs.get(id);
  if (job && !isActive(job) && job.expira <= Date.now()) {
    jobs.delete(id);
    return undefined;
  }
  return job;
};

/**
 * Representación pública de un trabajo (sin PDF, hash ni dueño).
 *
 * @param {object} job
 * @returns {object}
 */
export const toPublicJob = (job) => ({
  jobId: job.id,
  estado: job.estado,
  progreso: job.progreso,
  ...(job.libro_id ? { libro_id: job.libro_id } : {}),
  ...(job.error ? { error: job.error } : {}),
  ...(job.duracion_ms !== null ? { duracion_ms: job.duracion_ms } : {}),
});

/**
 * Vacía el registro y la cola. Solo para pruebas.
 */
export const resetJobs = () => {
  jobs.clear();
  hashIndex.clear();
  titleIndex.clear();
  queue.length = 0;
};
