/**
 * Caso de Uso: Obtener todos los libros del catálogo
 */
export class GetLibrosUseCase {
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  async execute() {
    return await this.libroRepository.getAll();
  }
}
