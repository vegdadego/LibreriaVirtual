import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { GetLibroUseCase } from '../../application/GetLibroUseCase';

/**
 * Carga los metadatos de un libro por id.
 *
 * @param {string} id
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{libro: import('../../domain/models/Libro').Libro|null, loading: boolean, error: string|null, notFound: boolean, reload: Function}}
 */
export function useLibro(id, repository = defaultLibroRepository) {
  const [libro, setLibro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const getUseCase = useMemo(() => new GetLibroUseCase(repository), [repository]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setLibro(await getUseCase.execute(id));
    } catch (err) {
      setLibro(null);
      if (err.status === 404 || err.status === 400) setNotFound(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getUseCase, id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { libro, loading, error, notFound, reload };
}
