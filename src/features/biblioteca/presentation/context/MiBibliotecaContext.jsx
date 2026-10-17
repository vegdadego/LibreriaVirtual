import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultMiBibliotecaRepository } from '../../infrastructure/MiBibliotecaApiRepository';
import {
  GetEstadoUseCase,
  GuardarProgresoUseCase,
  ToggleGuardadoUseCase,
} from '../../application/MiBibliotecaUseCases';
import { useAuth } from '../../../auth/presentation/context/AuthContext';

const MiBibliotecaContext = createContext(null);

/**
 * Mantiene en memoria qué libros guardó el usuario y por qué página va en cada
 * uno, para que botones y estantes se actualicen al instante. Se vacía al cerrar sesión.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {import('../../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} [props.repository]
 * @returns {JSX.Element}
 */
export function MiBibliotecaProvider({ children, repository = defaultMiBibliotecaRepository }) {
  const { isAuthenticated, user } = useAuth();
  const [guardados, setGuardados] = useState(() => new Set());
  const [progreso, setProgreso] = useState(() => new Map());
  const [version, setVersion] = useState(0);

  const getEstado = useMemo(() => new GetEstadoUseCase(repository), [repository]);
  const toggleUseCase = useMemo(() => new ToggleGuardadoUseCase(repository), [repository]);
  const progresoUseCase = useMemo(() => new GuardarProgresoUseCase(repository), [repository]);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      setGuardados(new Set());
      setProgreso(new Map());
      return undefined;
    }
    let cancelled = false;
    getEstado
      .execute()
      .then((estado) => {
        if (cancelled) return;
        setGuardados(new Set(estado.guardados));
        setProgreso(new Map(estado.progreso.map((p) => [p.libroId, p.paginaActual])));
      })
      .catch((err) => console.error('No se pudo cargar tu biblioteca:', err));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, getEstado]);

  const isGuardado = useCallback((libroId) => guardados.has(String(libroId)), [guardados]);
  const paginaActual = useCallback((libroId) => progreso.get(String(libroId)) ?? 0, [progreso]);

  /**
   * Guarda o quita un libro. Actualiza la pantalla de inmediato y deshace el
   * cambio si el servidor lo rechaza.
   *
   * @param {string} libroId
   * @returns {Promise<boolean>} Nuevo estado (`true` = guardado).
   */
  const toggleGuardado = useCallback(
    async (libroId) => {
      const id = String(libroId);
      const guardar = !guardados.has(id);
      const apply = (value) =>
        setGuardados((prev) => {
          const next = new Set(prev);
          if (value) next.add(id);
          else next.delete(id);
          return next;
        });

      apply(guardar);
      try {
        await toggleUseCase.execute(id, guardar);
        setVersion((v) => v + 1);
        return guardar;
      } catch (err) {
        apply(!guardar);
        throw err;
      }
    },
    [guardados, toggleUseCase]
  );

  /**
   * Recuerda la página actual de un libro. Falla en silencio: perder un
   * marcador no debe interrumpir la lectura.
   *
   * @param {string} libroId
   * @param {number} pagina
   */
  const registrarProgreso = useCallback(
    async (libroId, pagina) => {
      if (!isAuthenticated) return;
      const id = String(libroId);
      setProgreso((prev) => new Map(prev).set(id, pagina));
      try {
        await progresoUseCase.execute(id, pagina);
        setVersion((v) => v + 1);
      } catch (err) {
        console.error('No se pudo guardar el progreso de lectura:', err);
      }
    },
    [isAuthenticated, progresoUseCase]
  );

  /**
   * Quita un libro eliminado de lo guardado y del progreso, y avisa a las listas para recargarse.
   *
   * @param {string} libroId
   */
  const olvidarLibro = useCallback((libroId) => {
    const id = String(libroId);
    setGuardados((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setProgreso((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ isGuardado, paginaActual, toggleGuardado, registrarProgreso, olvidarLibro, version, repository }),
    [isGuardado, paginaActual, toggleGuardado, registrarProgreso, olvidarLibro, version, repository]
  );

  return <MiBibliotecaContext.Provider value={value}>{children}</MiBibliotecaContext.Provider>;
}

/**
 * Acceso a la biblioteca personal.
 *
 * `version` cambia cada vez que se guarda algo; las listas lo usan para recargarse.
 *
 * @returns {{
 *   isGuardado: (libroId: string) => boolean,
 *   paginaActual: (libroId: string) => number,
 *   toggleGuardado: (libroId: string) => Promise<boolean>,
 *   registrarProgreso: (libroId: string, pagina: number) => Promise<void>,
 *   olvidarLibro: (libroId: string) => void,
 *   version: number,
 *   repository: import('../../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository
 * }}
 */
export function useMiBiblioteca() {
  const context = useContext(MiBibliotecaContext);
  if (!context) throw new Error('useMiBiblioteca debe usarse dentro de un MiBibliotecaProvider');
  return context;
}
