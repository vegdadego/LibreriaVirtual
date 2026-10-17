import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { PrepararLibroUseCase } from '../../application/PrepararLibroUseCase';

const POLL_MS = 1000;
/** Tras tantos fallos de red seguidos al consultar la lectura, se da por perdida la preparación. */
const MAX_POLL_FAILURES = 5;

const INICIAL = {
  fase: 'inactivo',
  porcentaje: 0,
  progreso: null,
  stageId: null,
  portadaUrl: null,
  analisis: null,
  paginasSinTexto: null,
  error: null,
};

/**
 * Prepara un PDF para subirlo: lo envía **una sola vez** al servidor, que propone los datos del
 * libro, dibuja su portada y empieza a leer su texto mientras se rellena el formulario.
 *
 * `fase`: `inactivo` → `subiendo` (con `porcentaje`) → `leyendo` (con `progreso` de páginas) →
 * `listo` | `error`. Al terminar la lectura, `paginasSinTexto` dice cuántas páginas no traen texto
 * (imágenes o en blanco). Los datos detectados y la portada ya están disponibles desde `leyendo`.
 * Si se prepara otro PDF mientras uno está en curso, solo cuenta el último.
 *
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{
 *   fase: 'inactivo'|'subiendo'|'leyendo'|'listo'|'error',
 *   porcentaje: number,
 *   progreso: {paginas_procesadas: number, total_paginas: number|null}|null,
 *   stageId: string|null,
 *   portadaUrl: string|null,
 *   analisis: Object|null,
 *   paginasSinTexto: number|null,
 *   error: string|null,
 *   preparar: (pdf: File) => Promise<Object|null>,
 *   descartar: () => void,
 *   reiniciar: () => void
 * }} `preparar` resuelve con los datos detectados, o `null` si falló o fue reemplazada por otra preparación.
 */
export function usePreparacionPdf(repository = defaultLibroRepository) {
  const [estado, setEstado] = useState(INICIAL);
  const ultimo = useRef(0);
  const stageId = useRef(null);
  const abort = useRef(null);
  const timer = useRef(null);
  const alive = useRef(true);
  const useCase = useMemo(() => new PrepararLibroUseCase(repository), [repository]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      abort.current?.abort();
    };
  }, []);

  /** Corta la subida y el sondeo en curso y descarta en el servidor la preparación anterior. */
  const soltar = useCallback(() => {
    clearTimeout(timer.current);
    abort.current?.abort();
    abort.current = null;
    if (stageId.current) {
      useCase.descartar(stageId.current).catch(() => {});
      stageId.current = null;
    }
  }, [useCase]);

  const sondear = useCallback(
    (id, token) => {
      let fallos = 0;
      const tick = async () => {
        try {
          const lectura = await useCase.estado(id);
          if (!alive.current || token !== ultimo.current) return;
          fallos = 0;
          if (lectura.estado === 'error') {
            setEstado((e) => ({ ...e, fase: 'error', progreso: lectura.progreso, error: lectura.error?.message }));
          } else if (lectura.estado === 'listo') {
            setEstado((e) => ({
              ...e,
              fase: 'listo',
              progreso: lectura.progreso,
              paginasSinTexto: lectura.paginasSinTexto ?? null,
            }));
          } else {
            setEstado((e) => ({ ...e, progreso: lectura.progreso }));
            timer.current = setTimeout(tick, POLL_MS);
          }
        } catch (err) {
          if (!alive.current || token !== ultimo.current) return;
          fallos += 1;
          // Un 404 significa que la preparación caducó; un fallo de red puntual se reintenta.
          if (err.status === 404 || fallos >= MAX_POLL_FAILURES) {
            setEstado((e) => ({ ...e, fase: 'error', error: err.message || 'Se perdió la preparación del PDF.' }));
          } else {
            timer.current = setTimeout(tick, POLL_MS);
          }
        }
      };
      timer.current = setTimeout(tick, POLL_MS);
    },
    [useCase]
  );

  const preparar = useCallback(
    async (pdf) => {
      soltar();
      ultimo.current += 1;
      const token = ultimo.current;
      const controller = new AbortController();
      abort.current = controller;
      setEstado({ ...INICIAL, fase: 'subiendo' });

      try {
        const datos = await useCase.preparar(pdf, {
          signal: controller.signal,
          onProgress: ({ cargado, total }) => {
            if (alive.current && token === ultimo.current) {
              setEstado((e) => ({ ...e, porcentaje: total ? Math.round((cargado / total) * 100) : 0 }));
            }
          },
        });
        if (!alive.current || token !== ultimo.current) {
          // Llegó tarde: ya se eligió otro archivo, esta preparación sobra.
          useCase.descartar(datos.stageId).catch(() => {});
          return null;
        }
        stageId.current = datos.stageId;
        setEstado({
          fase: datos.estado === 'listo' ? 'listo' : 'leyendo',
          porcentaje: 100,
          progreso: datos.progreso,
          stageId: datos.stageId,
          portadaUrl: datos.portada ? `data:${datos.portada.mime};base64,${datos.portada.base64}` : null,
          analisis: datos.analisis,
          paginasSinTexto: datos.paginasSinTexto ?? null,
          error: null,
        });
        if (datos.estado !== 'listo') sondear(datos.stageId, token);
        return datos.analisis;
      } catch (err) {
        if (token === ultimo.current && alive.current && err.status !== 499) {
          setEstado({
            ...INICIAL,
            fase: 'error',
            error:
              err.status === 401
                ? 'Tu sesión expiró. Inicia sesión de nuevo.'
                : err.message || 'No se pudo preparar el PDF.',
          });
        }
        return null;
      }
    },
    [useCase, soltar, sondear]
  );

  const reiniciar = useCallback(() => {
    soltar();
    ultimo.current += 1;
    setEstado(INICIAL);
  }, [soltar]);

  return { ...estado, preparar, descartar: reiniciar, reiniciar };
}
