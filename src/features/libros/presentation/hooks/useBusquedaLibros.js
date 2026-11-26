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
 * @param {number} [options.limit=60] Resultados por página.
 * @param {number} [options.page=1] Página de resultados, desde 1.
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {{activa: boolean, resultados: Array, total: number, buscando: boolean, error: string|null}}
 */
export function useBusquedaLibros(texto, { limit = 60, page = 1, repository = defaultLibroRepository } = {}) {
  const consulta = texto.trim();
  const [estado, setEstado] = useState({ consulta: '', page: 1, resultados: [], total: 0, error: null });
  const listUseCase = useMemo(() => new ListLibrosUseCase(repository), [repository]);

  useEffect(() => {
    if (!consulta) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { libros, total } = await listUseCase.execute({ busqueda: consulta, page, limit });
        if (!cancelled) setEstado({ consulta, page, resultados: libros, total, error: null });
      } catch (err) {
        if (!cancelled) setEstado({ consulta, page, resultados: [], total: 0, error: err.message });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [consulta, page, limit, listUseCase]);

  // Mientras llega la respuesta de la consulta actual se sigue mostrando la anterior.
  const buscando = Boolean(consulta) && (estado.consulta !== consulta || estado.page !== page);
  return {
    activa: Boolean(consulta),
    resultados: consulta ? estado.resultados : [],
    total: estado.total,
    buscando,
    error: consulta ? estado.error : null,
  };
}
