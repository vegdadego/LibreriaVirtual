import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import {
  DeleteLibroUseCase,
  ListMisLibrosUseCase,
  UpdateLibroUseCase,
} from '../../application/MisLibrosUseCases';

/**
 * Los libros que gestiona el usuario (los que subió; un admin ve todos) con las acciones
 * de editar y eliminar. La lista se actualiza sola tras cada cambio.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] Con `false` no se pide nada (sin sesión o sin permiso).
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {{
 *   libros: Array<import('../../domain/models/Libro').Libro>,
 *   loading: boolean,
 *   error: string|null,
 *   reload: Function,
 *   editar: (id: string, datos: Record<string, any>) => Promise<void>,
 *   eliminar: (id: string) => Promise<void>
 * }}
 */
export function useMisLibros({ enabled = true, repository = defaultLibroRepository } = {}) {
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const cases = useMemo(
    () => ({
      list: new ListMisLibrosUseCase(repository),
      update: new UpdateLibroUseCase(repository),
      remove: new DeleteLibroUseCase(repository),
    }),
    [repository]
  );

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setLibros(await cases.list.execute());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, cases]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Guarda los cambios y reemplaza el libro en la lista. Lanza el error del servidor si lo rechaza. */
  const editar = useCallback(
    async (id, datos) => {
      const actualizado = await cases.update.execute(id, datos);
      setLibros((lista) => lista.map((libro) => (libro.id === id ? actualizado : libro)));
    },
    [cases]
  );

  /** Elimina el libro y lo quita de la lista. Lanza el error del servidor si lo rechaza. */
  const eliminar = useCallback(
    async (id) => {
      await cases.remove.execute(id);
      setLibros((lista) => lista.filter((libro) => libro.id !== id));
    },
    [cases]
  );

  return { libros, loading, error, reload, editar, eliminar };
}
