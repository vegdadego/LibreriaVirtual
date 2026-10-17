import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { ListLibrosUseCase } from '../../application/ListLibrosUseCase';

/**
 * Carga el catálogo de libros (los más recientes primero).
 *
 * @param {Object} [options]
 * @param {number} [options.limit=60] Libros a pedir.
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {{libros: Array, total: number, loading: boolean, error: string|null, reload: Function}}
 */
export function useCatalogo({ limit = 60, repository = defaultLibroRepository } = {}) {
  const [libros, setLibros] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const listUseCase = useMemo(() => new ListLibrosUseCase(repository), [repository]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUseCase.execute({ limit });
      setLibros(result.libros);
      setTotal(result.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listUseCase, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { libros, total, loading, error, reload };
}
