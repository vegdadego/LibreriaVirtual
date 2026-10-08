import { Prestamo } from '../domain/models/Prestamo';

/**
 * Caso de Uso: Registrar un nuevo préstamo
 */
export class RegistrarPrestamoUseCase {
  constructor(prestamoRepository) {
    this.prestamoRepository = prestamoRepository;
  }

  async execute(prestamoData) {
    const prestamo = new Prestamo(prestamoData);
    prestamo.validar();
    return await this.prestamoRepository.create(prestamo);
  }
}
