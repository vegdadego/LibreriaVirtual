/**
 * Casos de uso de las carpetas. Validan lo mínimo antes de llamar al servidor,
 * que es quien tiene la última palabra.
 */

/** Longitud máxima del nombre de una carpeta (igual que en el servidor). */
export const MAX_NOMBRE = 80;
/** Longitud máxima de la descripción (igual que en el servidor). */
export const MAX_DESCRIPCION = 300;

/**
 * Limpia y valida los datos del formulario de carpeta.
 *
 * @param {{nombre?: string, descripcion?: string}} datos
 * @returns {{nombre: string, descripcion: string}}
 * @throws {Error} Si el nombre falta o algún campo es demasiado largo.
 */
export function normalizarCarpeta({ nombre = '', descripcion = '' }) {
  const limpio = { nombre: nombre.trim(), descripcion: descripcion.trim() };
  if (!limpio.nombre) throw new Error('Escribe un nombre para la carpeta.');
  if (limpio.nombre.length > MAX_NOMBRE) throw new Error(`El nombre admite hasta ${MAX_NOMBRE} caracteres.`);
  if (limpio.descripcion.length > MAX_DESCRIPCION) {
    throw new Error(`La descripción admite hasta ${MAX_DESCRIPCION} caracteres.`);
  }
  return limpio;
}

/** Caso de uso: listar las carpetas del usuario. */
export class ListCarpetasUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.list();
  }
}

/** Caso de uso: abrir una carpeta con sus libros. */
export class GetCarpetaUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /** @param {string} id */
  execute(id) {
    return this.repository.getById(id);
  }
}

/** Caso de uso: crear una carpeta (opcionalmente con un primer libro). */
export class CrearCarpetaUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /** @param {{nombre: string, descripcion?: string, libroId?: string}} datos */
  execute({ libroId, ...datos }) {
    return this.repository.create({ ...normalizarCarpeta(datos), libroId });
  }
}

/** Caso de uso: cambiar el nombre y la descripción de una carpeta. */
export class EditarCarpetaUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} id
   * @param {{nombre: string, descripcion?: string}} datos
   */
  execute(id, datos) {
    return this.repository.update(id, normalizarCarpeta(datos));
  }
}

/** Caso de uso: borrar una carpeta (los libros no se borran). */
export class EliminarCarpetaUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /** @param {string} id */
  execute(id) {
    return this.repository.remove(id);
  }
}

/** Caso de uso: añadir o quitar un libro de una carpeta. */
export class CambiarLibroDeCarpetaUseCase {
  /** @param {import('../domain/repositories/CarpetaRepository').CarpetaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} carpetaId
   * @param {string} libroId
   * @param {boolean} incluir `true` para añadir, `false` para quitar.
   */
  execute(carpetaId, libroId, incluir) {
    return incluir
      ? this.repository.addBook(carpetaId, libroId)
      : this.repository.removeBook(carpetaId, libroId);
  }
}
