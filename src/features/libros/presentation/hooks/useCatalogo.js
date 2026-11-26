import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';
import { ListLibrosUseCase } from '../../application/ListLibrosUseCase';

/**
 * Carga una página del catálogo de libros (los más recientes primero).
 *
 * @param {Object} [options]
 * @param {number} [options.limit=60] Libros por página (el servidor admite hasta 100).
 * @param {number} [options.page=1] Página a pedir, desde 1.
 * @param {string|null} [options.categoria] Limita el catálogo a una categoría.
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [options.repository]
 * @returns {{libros: Array, total: number, loading: boolean, error: string|null, reload: Function}}
 *   `total` cuenta todos los libros que coinciden, no solo los de la página. `loading` sigue en
 *   `true` hasta que `libros` y `total` correspondan a las opciones actuales.
 */
export function useCatalogo({ limit = 60, page = 1, categoria = null, repository = defaultLibroRepository } = {}) {
  const [libros, setLibros] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ultimaPeticion = useRef(0);
  const [claveCargada, setClaveCargada] = useState(null);
  const clave = JSON.stringify([categoria, page, limit]);

  const listUseCase = useMemo(() => new ListLibrosUseCase(repository), [repository]);

  const reload = useCallback(async () => {
    // Al pasar páginas rápido, una respuesta vieja puede llegar después de la nueva: se descarta.
    ultimaPeticion.current += 1;
    const peticion = ultimaPeticion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await listUseCase.execute({ page, limit, categoria });
      if (peticion !== ultimaPeticion.current) return;
      setLibros(result.libros);
      setTotal(result.total);
    } catch (err) {
      if (peticion === ultimaPeticion.current) setError(err.message);
    } finally {
      if (peticion === ultimaPeticion.current) {
        setClaveCargada(clave);
        setLoading(false);
      }
    }
  }, [listUseCase, page, limit, categoria, clave]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Justo al cambiar las opciones, lo cargado aún es de las anteriores: cuenta como cargando.
  const pendiente = claveCargada !== clave;
  return { libros, total, loading: loading || pendiente, error: pendiente ? null : error, reload };
}
