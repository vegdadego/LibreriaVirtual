import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { defaultDescargaRepository } from '../../infrastructure/IndexedDbDescargaRepository';
import { buildBookPdf } from '../../infrastructure/buildBookPdf';
import { DescargarLibroUseCase, EliminarDescargaUseCase } from '../../application/DescargaUseCases';
import { defaultLibroRepository } from '../../../libros/infrastructure/defaultLibroRepository';
import { useAuth } from '../../../auth/presentation/context/AuthContext';

const DescargasContext = createContext(null);

/**
 * Lleva la cuenta de los libros descargados en este dispositivo y de las
 * descargas en curso. Se vacía al cambiar de usuario.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {import('../../domain/repositories/DescargaRepository').DescargaRepository} [props.repository]
 * @returns {JSX.Element}
 */
export function DescargasProvider({ children, repository = defaultDescargaRepository }) {
  const { user } = useAuth();
  const usuarioId = user?.id ?? null;
  const [ids, setIds] = useState(() => new Set());
  const [enCurso, setEnCurso] = useState(() => new Map());
  const [version, setVersion] = useState(0);
  const running = useRef(new Set());

  const descargarUseCase = useMemo(
    () =>
      new DescargarLibroUseCase({
        libroRepository: defaultLibroRepository,
        descargaRepository: repository,
        buildPdf: buildBookPdf,
      }),
    [repository]
  );
  const eliminarUseCase = useMemo(() => new EliminarDescargaUseCase(repository), [repository]);

  useEffect(() => {
    if (!usuarioId) {
      setIds(new Set());
      return undefined;
    }
    let cancelled = false;
    repository
      .ids(usuarioId)
      .then((list) => {
        if (!cancelled) setIds(new Set(list));
      })
      .catch((err) => console.error('No se pudieron leer las descargas:', err));
    return () => {
      cancelled = true;
    };
  }, [usuarioId, repository]);

  const isDescargado = useCallback((libroId) => ids.has(String(libroId)), [ids]);
  const progresoDe = useCallback((libroId) => enCurso.get(String(libroId)) ?? null, [enCurso]);

  /**
   * Descarga un libro. Lanza un error si falla (sin sesión, sin conexión, sin espacio...).
   *
   * @param {import('../../../libros/domain/models/Libro').Libro} libro
   * @returns {Promise<void>}
   */
  const descargar = useCallback(
    async (libro) => {
      if (!usuarioId) throw new Error('Inicia sesión para descargar libros.');
      if (running.current.has(libro.id)) return;
      running.current.add(libro.id);
      setEnCurso((prev) => new Map(prev).set(libro.id, { fase: 'texto' }));
      try {
        await descargarUseCase.execute(usuarioId, libro, (avance) =>
          setEnCurso((prev) => new Map(prev).set(libro.id, avance))
        );
        setIds((prev) => new Set(prev).add(libro.id));
        setVersion((v) => v + 1);
      } catch (error) {
        throw error?.name === 'QuotaExceededError'
          ? new Error('No hay espacio suficiente en el dispositivo para descargar este libro.')
          : error;
      } finally {
        running.current.delete(libro.id);
        setEnCurso((prev) => {
          const next = new Map(prev);
          next.delete(libro.id);
          return next;
        });
      }
    },
    [usuarioId, descargarUseCase]
  );

  /**
   * Borra la descarga de un libro del dispositivo.
   *
   * @param {string} libroId
   * @returns {Promise<void>}
   */
  const quitar = useCallback(
    async (libroId) => {
      if (!usuarioId) return;
      await eliminarUseCase.execute(usuarioId, String(libroId));
      defaultLibroRepository.forget?.(String(libroId));
      setIds((prev) => {
        const next = new Set(prev);
        next.delete(String(libroId));
        return next;
      });
      setVersion((v) => v + 1);
    },
    [usuarioId, eliminarUseCase]
  );

  const value = useMemo(
    () => ({ usuarioId, isDescargado, progresoDe, descargar, quitar, version, repository }),
    [usuarioId, isDescargado, progresoDe, descargar, quitar, version, repository]
  );

  return <DescargasContext.Provider value={value}>{children}</DescargasContext.Provider>;
}

/**
 * Acceso a las descargas del dispositivo.
 *
 * @returns {{
 *   usuarioId: string|null,
 *   isDescargado: (libroId: string) => boolean,
 *   progresoDe: (libroId: string) => ({fase: string, hecho?: number, total?: number}|null),
 *   descargar: (libro: object) => Promise<void>,
 *   quitar: (libroId: string) => Promise<void>,
 *   version: number,
 *   repository: import('../../domain/repositories/DescargaRepository').DescargaRepository
 * }}
 */
export function useDescargas() {
  const context = useContext(DescargasContext);
  if (!context) throw new Error('useDescargas debe usarse dentro de un DescargasProvider');
  return context;
}
