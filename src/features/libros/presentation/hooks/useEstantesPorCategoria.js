import { useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { ListLibrosUseCase } from '../../application/ListLibrosUseCase';
import { agruparPorCategoria, LIBROS_POR_ESTANTE } from '../../domain/paginacion';

/**
 * Estantes por categoría del inicio. Las categorías se eligen entre los libros de `muestra`
 * (las que más aparecen) y cada estante se completa pidiendo al servidor los libros de esa
 * categoría. Mientras llegan, o si la petición falla, muestra los de la muestra.
 *
 * @param {Array<import('../../domain/models/Libro').Libro>} muestra Libros recientes; debe ser
 *   un arreglo estable entre renderizados.
 * @param {Object} [options]
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {Array<{categoria: string, libros: Array}>}
 */
export function useEstantesPorCategoria(muestra, { repository = defaultLibroRepository } = {}) {
  const base = useMemo(() => agruparPorCategoria(muestra), [muestra]);
  const [completos, setCompletos] = useState({});
  const listUseCase = useMemo(() => new ListLibrosUseCase(repository), [repository]);

  useEffect(() => {
    let cancelled = false;
    base.forEach(async ({ categoria }) => {
      try {
        const { libros } = await listUseCase.execute({ categoria, limit: LIBROS_POR_ESTANTE });
        if (!cancelled) setCompletos((actual) => ({ ...actual, [categoria]: libros }));
      } catch {
        // El estante se queda con los libros de la muestra.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base, listUseCase]);

  return base.map((estante) => ({ ...estante, libros: completos[estante.categoria] ?? estante.libros }));
}
