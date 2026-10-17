import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultCarpetaRepository } from '../../infrastructure/CarpetaApiRepository';
import {
  CambiarLibroDeCarpetaUseCase,
  CrearCarpetaUseCase,
  EditarCarpetaUseCase,
  EliminarCarpetaUseCase,
  GetCarpetaUseCase,
  ListCarpetasUseCase,
} from '../../application/CarpetaUseCases';
import { useAuth } from '../../../auth/presentation/context/AuthContext';

const CarpetasContext = createContext(null);

/**
 * Mantiene las carpetas del usuario en memoria para que la lista, el detalle y
 * el diálogo "Añadir a carpeta" se mantengan al día. Se vacía al cerrar sesión.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {import('../../domain/repositories/CarpetaRepository').CarpetaRepository} [props.repository]
 * @returns {JSX.Element}
 */
export function CarpetasProvider({ children, repository = defaultCarpetaRepository }) {
  const { isAuthenticated, user } = useAuth();
  const [carpetas, setCarpetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const cases = useMemo(
    () => ({
      list: new ListCarpetasUseCase(repository),
      get: new GetCarpetaUseCase(repository),
      create: new CrearCarpetaUseCase(repository),
      edit: new EditarCarpetaUseCase(repository),
      remove: new EliminarCarpetaUseCase(repository),
      toggleBook: new CambiarLibroDeCarpetaUseCase(repository),
    }),
    [repository]
  );

  const userId = user?.id ?? null;

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      setCarpetas(await cases.list.execute());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, cases]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCarpetas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    reload();
  }, [isAuthenticated, userId, reload]);

  /**
   * Crea una carpeta; si se pasa `libroId`, el libro entra directamente.
   *
   * @param {{nombre: string, descripcion?: string, libroId?: string}} datos
   * @returns {Promise<import('../../domain/models/Carpeta').Carpeta>}
   */
  const crear = useCallback(
    async (datos) => {
      const carpeta = await cases.create.execute(datos);
      setCarpetas((prev) => [carpeta, ...prev]);
      setVersion((v) => v + 1);
      return carpeta;
    },
    [cases]
  );

  /**
   * Cambia el nombre y la descripción de una carpeta.
   *
   * @param {string} id
   * @param {{nombre: string, descripcion?: string}} datos
   * @returns {Promise<import('../../domain/models/Carpeta').Carpeta>}
   */
  const editar = useCallback(
    async (id, datos) => {
      const carpeta = await cases.edit.execute(id, datos);
      setCarpetas((prev) => [carpeta, ...prev.filter((c) => c.id !== id)]);
      setVersion((v) => v + 1);
      return carpeta;
    },
    [cases]
  );

  /**
   * Borra una carpeta (sus libros no se borran).
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  const eliminar = useCallback(
    async (id) => {
      await cases.remove.execute(id);
      setCarpetas((prev) => prev.filter((c) => c.id !== id));
      setVersion((v) => v + 1);
    },
    [cases]
  );

  /**
   * Añade o quita un libro de una carpeta. Se refleja de inmediato y se
   * deshace si el servidor lo rechaza.
   *
   * @param {string} carpetaId
   * @param {string} libroId
   * @param {boolean} incluir
   * @returns {Promise<void>}
   */
  const cambiarLibro = useCallback(
    async (carpetaId, libroId, incluir) => {
      const id = String(libroId);
      const apply = (add) =>
        setCarpetas((prev) =>
          prev.map((c) => {
            if (c.id !== carpetaId) return c;
            const ids = add ? [...c.libroIds.filter((x) => x !== id), id] : c.libroIds.filter((x) => x !== id);
            return Object.assign(Object.create(Object.getPrototypeOf(c)), c, { libroIds: ids });
          })
        );

      apply(incluir);
      try {
        await cases.toggleBook.execute(carpetaId, id, incluir);
      } catch (err) {
        apply(!incluir);
        throw err;
      }
      setVersion((v) => v + 1);
      // Los mosaicos de portadas cambian; se refrescan sin bloquear la pantalla.
      reload();
    },
    [cases, reload]
  );

  /**
   * Abre una carpeta con sus libros completos.
   *
   * @param {string} id
   * @returns {Promise<import('../../domain/models/Carpeta').Carpeta>}
   */
  const obtener = useCallback((id) => cases.get.execute(id), [cases]);

  const value = useMemo(
    () => ({ carpetas, loading, error, version, reload, crear, editar, eliminar, cambiarLibro, obtener }),
    [carpetas, loading, error, version, reload, crear, editar, eliminar, cambiarLibro, obtener]
  );

  return <CarpetasContext.Provider value={value}>{children}</CarpetasContext.Provider>;
}

/**
 * Acceso a las carpetas del usuario.
 *
 * `version` cambia con cada modificación; el detalle de una carpeta lo usa para recargarse.
 *
 * @returns {{
 *   carpetas: import('../../domain/models/Carpeta').Carpeta[],
 *   loading: boolean,
 *   error: string|null,
 *   version: number,
 *   reload: Function,
 *   crear: Function,
 *   editar: Function,
 *   eliminar: Function,
 *   cambiarLibro: Function,
 *   obtener: Function
 * }}
 */
export function useCarpetas() {
  const context = useContext(CarpetasContext);
  if (!context) throw new Error('useCarpetas debe usarse dentro de un CarpetasProvider');
  return context;
}
