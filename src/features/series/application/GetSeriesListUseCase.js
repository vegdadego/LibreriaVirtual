/**
 * Caso de Uso: Listar series para la pantalla principal
 */
export class GetSeriesListUseCase {
  constructor(seriesRepository) {
    this.seriesRepository = seriesRepository;
  }

  async execute() {
    return await this.seriesRepository.getAll();
  }
}
