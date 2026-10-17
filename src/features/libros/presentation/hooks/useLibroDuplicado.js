import { useEffect, useState } from 'react';
import { defaultLibroRepository } from '../../infrastructure/defaultLibroRepository';

const DEBOUNCE_MS = 450;

/**
 * Comprueba, mientras se rellena el formulario de subida, si el libro ya está en la biblioteca
 * (por título, edición, idioma y autores, y por el propio PDF preparado).
 *
 * @param {{titulo: string, autores?: string, numeroEdicion?: string, idioma?: string, stageId?: string|null}} datos
 * @param {boolean} activo Con `false` no consulta (por ejemplo, mientras se envía el formulario).
 * @param {import('../../domain/repositories/LibroRepository').LibroRepository} [repository]
 * @returns {{duplicado: {libroId: string, titulo: string}|null, comprobando: boolean}}
 */
export function useLibroDuplicado({ titulo, autores, numeroEdicion, idioma, stageId }, activo = true, repository = defaultLibroRepository) {
  const [estado, setEstado] = useState({ clave: '', duplicado: null });
  const nombre = titulo.trim();
  const clave = `${nombre}|${autores}|${numeroEdicion}|${idioma}|${stageId}`;

  useEffect(() => {
    if (!activo || !nombre) return undefined;
    let vigente = true;
    const timer = setTimeout(async () => {
      try {
        const duplicado = await repository.findDuplicate({ titulo: nombre, autores, numeroEdicion, idioma, stageId });
        if (vigente) setEstado({ clave, duplicado });
      } catch {
        // Sin conexión o sin sesión: lo vuelve a comprobar el servidor al guardar.
        if (vigente) setEstado({ clave, duplicado: null });
      }
    }, DEBOUNCE_MS);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [activo, nombre, autores, numeroEdicion, idioma, stageId, clave, repository]);

  const vigente = estado.clave === clave;
  return { duplicado: activo && nombre && vigente ? estado.duplicado : null, comprobando: activo && Boolean(nombre) && !vigente };
}
