import { SeriesRepository } from '../domain/repositories/SeriesRepository';
import { Series } from '../domain/models/Series';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

const INITIAL_MOCK_SERIES = [
  new Series({
    id: 0,
    title: 'Solo Swordmaster',
    views: '1.2M',
    likes: '1.4K',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop',
    synopsis: 'El único maestro de la espada renace en un mundo al borde del colapso. Con los recuerdos de su vida pasada y la maestría definitiva de la hoja, Solo Swordmaster abrirá un nuevo camino para proteger a la humanidad contra la invasión de seres oscuros.',
    totalChapters: 20,
    chapters: Array.from({ length: 20 }, (_, i) => ({
      num: 20 - i,
      title: `Capítulo ${20 - i}`,
      scanGroup: 'Por Olympus',
      timeAgo: 'Hace 5 días'
    })),
    pages: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 1,
    title: 'El hijo menor del Maestro de la Espada',
    views: '3.5M',
    likes: '8.9K',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Jin Runcandel era el hijo menor de la familia de espadachines más poderosa. Tras ser desterrado vilmente, hace un pacto divino para retroceder en el tiempo y reclamar el trono de su linaje.',
    totalChapters: 45,
    chapters: Array.from({ length: 20 }, (_, i) => ({
      num: 45 - i,
      title: `Capítulo ${45 - i}`,
      scanGroup: 'Por Olympus',
      timeAgo: 'Hace 2 días'
    })),
    pages: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 2,
    title: 'La leyenda de cultivación de un regresor',
    views: '890K',
    likes: '3.2K',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Atrapado en un ciclo infinito de reencarnaciones, un gran sabio marcial decide romper las leyes del cielo para alcanzar el reino supremo de la inmortalidad.',
    totalChapters: 19,
    chapters: Array.from({ length: 19 }, (_, i) => ({
      num: 19 - i,
      title: `Capítulo ${19 - i}`,
      scanGroup: 'Por Olympus Scan',
      timeAgo: 'Hace 1 día'
    })),
    pages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 3,
    title: 'Acampando en otro mundo buscándole el sazón a la vida',
    views: '450K',
    likes: '2.1K',
    cover: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Reencarnado en un mundo lleno de monstruos peligrosos, nuestro protagonista solo desea disfrutar de la cocina gourmet y la acampada pacífica al aire libre.',
    totalChapters: 12,
    chapters: Array.from({ length: 12 }, (_, i) => ({
      num: 12 - i,
      title: `Capítulo ${12 - i}`,
      scanGroup: 'Por Olympus',
      timeAgo: 'Hace 1 semana'
    })),
    pages: [
      'https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 4,
    title: 'El Señor Demonio del Rey Supremo',
    views: '2.1M',
    likes: '5.4K',
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Tras mil años de letargo, el Rey Demonio despierta en un cuerpo de estudiante de preparatoria en la era moderna.',
    totalChapters: 30,
    chapters: Array.from({ length: 30 }, (_, i) => ({
      num: 30 - i,
      title: `Capítulo ${30 - i}`,
      scanGroup: 'Por Olympus',
      timeAgo: 'Hace 3 días'
    })),
    pages: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=900&auto=format&fit=crop'
    ]
  })
];

let localSeriesStorage = [...INITIAL_MOCK_SERIES];
let localCommentsStorage = {
  0: [
    {
      id: 1,
      author: 'Lectormaniaco',
      text: '¡Increíble capítulo! La calidad del dibujo en este manhwa supera a casi todos de la temporada.',
      timeAgo: 'Hace 2 horas',
      avatarInitial: 'L'
    }
  ]
};

export class SeriesApiRepository extends SeriesRepository {
  async getAll() {
    try {
      const data = await apiClient.get(ENDPOINTS.SERIES.BASE);
      return data.map((item) => new Series(item));
    } catch {
      return [...localSeriesStorage];
    }
  }

  async getById(id) {
    try {
      const data = await apiClient.get(ENDPOINTS.SERIES.DETAIL(id));
      return new Series(data);
    } catch {
      return localSeriesStorage.find((s) => s.id === Number(id)) || localSeriesStorage[0];
    }
  }

  async getFeatured() {
    try {
      const data = await apiClient.get(ENDPOINTS.SERIES.FEATURED);
      return new Series(data);
    } catch {
      // El hijo menor del Maestro de la Espada como serie destacada
      return localSeriesStorage[1] || localSeriesStorage[0];
    }
  }

  async getChapterPages(seriesId, chapterNum) {
    try {
      return await apiClient.get(ENDPOINTS.SERIES.CHAPTER_PAGES(seriesId, chapterNum));
    } catch {
      const series = localSeriesStorage.find((s) => s.id === Number(seriesId)) || localSeriesStorage[0];
      return series.pages || [];
    }
  }

  async getComments(seriesId) {
    try {
      return await apiClient.get(ENDPOINTS.SERIES.COMMENTS(seriesId));
    } catch {
      return localCommentsStorage[seriesId] || [];
    }
  }

  async addComment(seriesId, commentData) {
    try {
      return await apiClient.post(ENDPOINTS.SERIES.COMMENTS(seriesId), commentData);
    } catch {
      const newComment = {
        id: Date.now(),
        author: commentData.author || 'Tú (Lector)',
        text: commentData.text,
        timeAgo: 'Ahora mismo',
        avatarInitial: 'U'
      };
      if (!localCommentsStorage[seriesId]) {
        localCommentsStorage[seriesId] = [];
      }
      localCommentsStorage[seriesId] = [newComment, ...localCommentsStorage[seriesId]];
      return newComment;
    }
  }
}

export const defaultSeriesRepository = new SeriesApiRepository();
