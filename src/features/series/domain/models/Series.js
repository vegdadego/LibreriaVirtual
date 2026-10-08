/**
 * Entidad de Dominio: Series (Manhwa, Cómic o Manga)
 */
export class Series {
  constructor({
    id,
    title,
    views = '0',
    likes = '0',
    cover,
    synopsis = '',
    totalChapters = 0,
    chapters = [],
    pages = []
  }) {
    this.id = id !== undefined ? Number(id) : null;
    this.title = title || 'Sin Título';
    this.views = views;
    this.likes = likes;
    this.cover = cover;
    this.synopsis = synopsis;
    this.totalChapters = totalChapters || (chapters ? chapters.length : 0);
    this.chapters = chapters || [];
    this.pages = pages || [];
  }

  get formattedLikes() {
    return `${this.likes} me gusta`;
  }

  get formattedViews() {
    return `${this.views} vistas`;
  }
}
