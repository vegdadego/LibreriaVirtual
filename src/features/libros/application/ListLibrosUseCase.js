/** Caso de uso: listar o buscar libros del catálogo (paginado). */
export class ListLibrosUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {{busqueda?: string, categoria?: string, autor?: string, saga?: string, page?: number, limit?: number}} [filtros]
   * @returns {Promise<{libros: import('../domain/models/Libro').Libro[], total: number}>}
   */
  execute(filtros) {
    return this.libroRepository.list(filtros);
  }
}
