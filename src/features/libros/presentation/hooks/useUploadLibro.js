import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { UploadLibroUseCase } from '../../application/UploadLibroUseCase';

const POLL_MS = 1000;
/** Tras tantos fallos de red seguidos al consultar el estado, se da por perdida la carga. */
const MAX_POLL_FAILURES = 5;

/**
 * Gestiona la subida de un libro: envío, consulta periódica del estado y resultado.
 *
 * `fase`: `inactivo` → `enviando` → `procesando` → `completado` | `error`.
 *
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{
 *   fase: 'inactivo'|'enviando'|'procesando'|'completado'|'error',
 *   progreso: {paginas_procesadas: number, total_paginas: number|null}|null,
 *   libroId: string|null,
 *   error: {code?: string, message: string, libroId?: string}|null,
 *   subir: Function,
 *   reiniciar: Function
 * }}
 */
export function useUploadLibro(repository = defaultLibroRepository) {
  const [fase, setFase] = useState('inactivo');
  const [progreso, setProgreso] = useState(null);
  const [libroId, setLibroId] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const alive = useRef(true);

  const useCase = useMemo(() => new UploadLibroUseCase(repository), [repository]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const fail = useCallback((err) => {
    if (!alive.current) return;
    setError({
      code: err.code ?? err.data?.code,
      message:
        err.status === 401
          ? 'Tu sesión expiró. Inicia sesión de nuevo para subir el libro.'
          : err.message,
      libroId: err.libro_id ?? err.data?.libro_id,
    });
    setFase('error');
  }, []);

  const poll = useCallback(
    (jobId) => {
      let failures = 0;
      const tick = async () => {
        try {
          const job = await useCase.status(jobId);
          if (!alive.current) return;
          failures = 0;
          setProgreso(job.progreso);
          if (job.estado === 'completado') {
            setLibroId(job.libroId);
            setFase('completado');
          } else if (job.estado === 'error') {
            fail({ ...job.error, libro_id: job.error?.libro_id });
          } else {
            timer.current = setTimeout(tick, POLL_MS);
          }
        } catch (err) {
          if (!alive.current) return;
          failures += 1;
          // Un 404 significa que la carga expiró; un fallo de red puntual se reintenta.
          if (err.status === 404 || failures >= MAX_POLL_FAILURES) fail(err);
          else timer.current = setTimeout(tick, POLL_MS);
        }
      };
      timer.current = setTimeout(tick, POLL_MS);
    },
    [useCase, fail]
  );

  const subir = useCallback(
    async (datos) => {
      setFase('enviando');
      setError(null);
      setProgreso(null);
      setLibroId(null);
      try {
        const { jobId } = await useCase.start(datos);
        if (!alive.current) return;
        setFase('procesando');
        poll(jobId);
      } catch (err) {
        fail(err);
      }
    },
    [useCase, poll, fail]
  );

  const reiniciar = useCallback(() => {
    clearTimeout(timer.current);
    setFase('inactivo');
    setError(null);
    setProgreso(null);
    setLibroId(null);
  }, []);

  return { fase, progreso, libroId, error, subir, reiniciar };
}
