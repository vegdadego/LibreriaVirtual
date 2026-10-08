/**
 * Caso de Uso: Obtener métricas consolidadas del sistema
 */
export class GetDashboardMetricsUseCase {
  constructor(dashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  async execute() {
    return await this.dashboardRepository.getMetricas();
  }
}
