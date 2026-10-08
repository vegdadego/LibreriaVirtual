/**
 * Caso de Uso: Eliminar un libro por su ID
 */
export class DeleteLibroUseCase {
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  async execute(id) {
    return await this.libroRepository.delete(id);
  }
}
