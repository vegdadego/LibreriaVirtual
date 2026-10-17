/** Caso de uso: obtener el texto de una página de un libro. */
export class GetPaginaUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {string} libroId
   * @param {number} numero Página, desde 1.
   */
  execute(libroId, numero) {
    return this.libroRepository.getPage(libroId, numero);
  }
}
