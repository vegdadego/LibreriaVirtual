import { useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { ListLibrosUseCase } from '../../application/ListLibrosUseCase';

const DEBOUNCE_MS = 300;

/**
 * Busca en el catálogo (`GET /books?busqueda=`) mientras se escribe, con retardo para
 * no pedir en cada letra. Con el texto vacío no consulta y devuelve `activa: false`.
 *
 * @param {string} texto Lo que escribió la persona.
 * @param {Object} [options]
 * @param {number} [options.limit=60] Máximo de resultados.
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {{activa: boolean, resultados: Array, total: number, buscando: boolean, error: string|null}}
 */
export function useBusquedaLibros(texto, { limit = 60, repository = defaultLibroRepository } = {}) {
  const consulta = texto.trim();
  const [estado, setEstado] = useState({ consulta: '', resultados: [], total: 0, error: null });
  const listUseCase = useMemo(() => new ListLibrosUseCase(repository), [repository]);

  useEffect(() => {
    if (!consulta) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { libros, total } = await listUseCase.execute({ busqueda: consulta, limit });
        if (!cancelled) setEstado({ consulta, resultados: libros, total, error: null });
      } catch (err) {
        if (!cancelled) setEstado({ consulta, resultados: [], total: 0, error: err.message });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [consulta, limit, listUseCase]);

  // Mientras llega la respuesta de la consulta actual se sigue mostrando la anterior.
  const buscando = Boolean(consulta) && estado.consulta !== consulta;
  return {
    activa: Boolean(consulta),
    resultados: consulta ? estado.resultados : [],
    total: estado.total,
    buscando,
    error: consulta ? estado.error : null,
  };
}
