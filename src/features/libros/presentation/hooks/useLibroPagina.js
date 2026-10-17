import { useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { GetPaginaUseCase } from '../../application/GetPaginaUseCase';

/**
 * Carga una página de texto de un libro y precarga la siguiente.
 *
 * @param {string} libroId
 * @param {number} numero Página, desde 1.
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{pagina: import('../../domain/models/Libro').PaginaLibro|null, loading: boolean, error: string|null, notFound: boolean}}
 */
export function useLibroPagina(libroId, numero, repository = defaultLibroRepository) {
  const [pagina, setPagina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const getUseCase = useMemo(() => new GetPaginaUseCase(repository), [repository]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getUseCase
      .execute(libroId, numero)
      .then((result) => {
        if (cancelled) return;
        setPagina(result);
        // La siguiente página se pide en segundo plano para que el cambio sea inmediato.
        if (result.siguiente) getUseCase.execute(libroId, result.siguiente).catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        setPagina(null);
        if (err.status === 404 || err.status === 400) setNotFound(true);
        else setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getUseCase, libroId, numero]);

  return { pagina, loading, error, notFound };
}
