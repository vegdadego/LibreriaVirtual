/**
 * Caso de Uso: Obtener el detalle de una serie con capítulos y páginas
 */
export class GetSeriesDetailUseCase {
  constructor(seriesRepository) {
    this.seriesRepository = seriesRepository;
  }

  async execute(id) {
    return await this.seriesRepository.getById(id);
  }
}
