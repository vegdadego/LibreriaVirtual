/**
 * Caso de Uso: Obtener la serie destacada del Hero Banner
 */
export class GetFeaturedSeriesUseCase {
  constructor(seriesRepository) {
    this.seriesRepository = seriesRepository;
  }

  async execute() {
    return await this.seriesRepository.getFeatured();
  }
}
