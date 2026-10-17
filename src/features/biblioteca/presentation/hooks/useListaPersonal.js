import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListGuardadosUseCase, ListProgresoUseCase } from '../../application/MiBibliotecaUseCases';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useMiBiblioteca } from '../context/MiBibliotecaContext';

/**
 * Carga una lista personal (guardados o "continuar leyendo") y la recarga
 * cuando el usuario guarda algo o avanza en un libro.
 *
 * @param {'guardados'|'progreso'} tipo
 * @returns {{items: Array, loading: boolean, error: string|null, reload: Function}}
 *   `items` son `Libro` para `guardados` y `{libro, paginaActual}` para `progreso`.
 */
export function useListaPersonal(tipo) {
  const { isAuthenticated } = useAuth();
  const { repository, version } = useMiBiblioteca();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(null);

  const useCase = useMemo(
    () => (tipo === 'guardados' ? new ListGuardadosUseCase(repository) : new ListProgresoUseCase(repository)),
    [tipo, repository]
  );

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setItems(await useCase.execute());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, useCase]);

  // `version` cambia al guardar: la lista se refresca sin mostrar el estado de carga.
  useEffect(() => {
    reload();
  }, [reload, version]);

  return { items, loading, error, reload };
}
