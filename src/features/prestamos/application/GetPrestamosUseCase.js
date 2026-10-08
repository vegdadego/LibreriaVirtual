/**
 * Caso de Uso: Obtener todos los préstamos
 */
export class GetPrestamosUseCase {
  constructor(prestamoRepository) {
    this.prestamoRepository = prestamoRepository;
  }

  async execute() {
    return await this.prestamoRepository.getAll();
  }
}
