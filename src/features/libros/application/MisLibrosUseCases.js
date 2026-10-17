/** Casos de uso de "Mis libros": listar, editar y eliminar los libros que gestiona el usuario. */

/** Libros que se piden por página al backend (su máximo). */
const PAGE_SIZE = 100;
/** Tope de páginas que se recorren, para no pedir sin fin si el total cambia. */
const MAX_PAGES = 20;

/** Caso de uso: todos los libros que gestiona el usuario en sesión. */
export class ListMisLibrosUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * Recorre las páginas del listado propio hasta completarlo.
   *
   * @returns {Promise<import('../domain/models/Libro').Libro[]>} Los más recientes primero.
   */
  async execute() {
    const libros = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await this.libroRepository.listMine({ page, limit: PAGE_SIZE });
      libros.push(...result.libros);
      if (result.libros.length === 0 || libros.length >= result.total) break;
    }
    return libros;
  }
}

/** Caso de uso: editar los metadatos de un libro propio. */
export class UpdateLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {string} id
   * @param {Record<string, any>} datos Campos a cambiar, con los nombres del backend.
   * @returns {Promise<import('../domain/models/Libro').Libro>} El libro ya actualizado.
   */
  execute(id, datos) {
    return this.libroRepository.update(id, datos);
  }
}

/** Caso de uso: eliminar un libro propio. */
export class DeleteLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  execute(id) {
    return this.libroRepository.remove(id);
  }
}
