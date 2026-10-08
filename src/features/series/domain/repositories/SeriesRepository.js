/**
 * Contrato de Dominio: SeriesRepository
 * Define las operaciones que la infraestructura (API Backend o Mock) debe satisfacer.
 */
export class SeriesRepository {
  async getAll() {
    throw new Error('getAll() no implementado');
  }

  async getById(id) {
    throw new Error('getById(id) no implementado');
  }

  async getFeatured() {
    throw new Error('getFeatured() no implementado');
  }

  async getChapterPages(seriesId, chapterNum) {
    throw new Error('getChapterPages(seriesId, chapterNum) no implementado');
  }

  async addComment(seriesId, commentData) {
    throw new Error('addComment(seriesId, commentData) no implementado');
  }
}
