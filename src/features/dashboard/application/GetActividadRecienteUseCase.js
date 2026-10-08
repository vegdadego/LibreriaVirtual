/**
 * Caso de Uso: Obtener lista de actividades recientes
 */
export class GetActividadRecienteUseCase {
  constructor(dashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  async execute() {
    return await this.dashboardRepository.getActividadReciente();
  }
}
