/**
 * Caso de Uso: Registrar la devolución de un libro prestado
 */
export class DevolverLibroUseCase {
  constructor(prestamoRepository) {
    this.prestamoRepository = prestamoRepository;
  }

  async execute(id) {
    return await this.prestamoRepository.devolver(id);
  }
}
