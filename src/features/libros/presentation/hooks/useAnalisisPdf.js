import { useCallback, useMemo, useRef, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { AnalizarLibroUseCase } from '../../application/AnalizarLibroUseCase';

const INICIAL = { fase: 'inactivo', error: null };

/**
 * Pide al servidor que lea un PDF y proponga los datos del libro.
 *
 * `fase`: `inactivo` → `analizando` → `listo` | `error`. Si se pide otro análisis
 * mientras uno está en curso, solo cuenta el último (el anterior se descarta).
 *
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{
 *   fase: 'inactivo'|'analizando'|'listo'|'error',
 *   error: string|null,
 *   analizar: (pdf: File) => Promise<Object|null>,
 *   reiniciar: () => void
 * }} `analizar` resuelve con los datos detectados, o `null` si falló o fue reemplazado por otro análisis.
 */
export function useAnalisisPdf(repository = defaultLibroRepository) {
  const [estado, setEstado] = useState(INICIAL);
  const ultimo = useRef(0);
  const useCase = useMemo(() => new AnalizarLibroUseCase(repository), [repository]);

  const analizar = useCallback(
    async (pdf) => {
      ultimo.current += 1;
      const id = ultimo.current;
      setEstado({ fase: 'analizando', error: null });
      try {
        const datos = await useCase.execute(pdf);
        if (id !== ultimo.current) return null;
        setEstado({ fase: 'listo', error: null });
        return datos;
      } catch (err) {
        if (id === ultimo.current) {
          setEstado({
            fase: 'error',
            error:
              err.status === 401
                ? 'Tu sesión expiró. Inicia sesión de nuevo.'
                : err.message || 'No se pudo analizar el PDF.',
          });
        }
        return null;
      }
    },
    [useCase]
  );

  const reiniciar = useCallback(() => {
    ultimo.current += 1;
    setEstado(INICIAL);
  }, []);

  return { ...estado, analizar, reiniciar };
}
