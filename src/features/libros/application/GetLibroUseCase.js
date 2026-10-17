/** Caso de uso: obtener los metadatos de un libro. */
export class GetLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /** @param {string} id */
  execute(id) {
    return this.libroRepository.getById(id);
  }
}
