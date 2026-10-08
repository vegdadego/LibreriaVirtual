/**
 * Caso de Uso: Agregar un comentario a una serie
 */
export class AddCommentUseCase {
  constructor(seriesRepository) {
    this.seriesRepository = seriesRepository;
  }

  async execute(seriesId, commentData) {
    if (!commentData.text || commentData.text.trim() === '') {
      throw new Error('El comentario no puede estar vacío.');
    }
    return await this.seriesRepository.addComment(seriesId, commentData);
  }
}
