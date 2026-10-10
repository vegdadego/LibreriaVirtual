import { SeriesRepository } from '../domain/repositories/SeriesRepository';
import { Series } from '../domain/models/Series';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

const INITIAL_MOCK_SERIES = [
  new Series({
    id: 0,
    title: 'Lorem Ipsum Dolor',
    views: '1.2M',
    likes: '1.4K',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    totalChapters: 20,
    chapters: Array.from({ length: 20 }, (_, i) => ({
      num: 20 - i,
      title: `Capítulo ${20 - i}`,
      scanGroup: 'Por Scan',
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
    title: 'Consectetur Adipiscing Elit',
    views: '3.5M',
    likes: '8.9K',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    totalChapters: 45,
    chapters: Array.from({ length: 20 }, (_, i) => ({
      num: 45 - i,
      title: `Capítulo ${45 - i}`,
      scanGroup: 'Por Scan',
      timeAgo: 'Hace 2 días'
    })),
    pages: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 2,
    title: 'Sed Ut Perspiciatis Unde',
    views: '890K',
    likes: '3.2K',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro quisquam est.',
    totalChapters: 19,
    chapters: Array.from({ length: 19 }, (_, i) => ({
      num: 19 - i,
      title: `Capítulo ${19 - i}`,
      scanGroup: 'Por Scan',
      timeAgo: 'Hace 1 día'
    })),
    pages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 3,
    title: 'Quis Autem Vel Eum Iure',
    views: '450K',
    likes: '2.1K',
    cover: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=600&auto=format&fit=crop',
    synopsis: 'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.',
    totalChapters: 12,
    chapters: Array.from({ length: 12 }, (_, i) => ({
      num: 12 - i,
      title: `Capítulo ${12 - i}`,
      scanGroup: 'Por Scan',
      timeAgo: 'Hace 1 semana'
    })),
    pages: [
      'https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=900&auto=format&fit=crop'
    ]
  }),
  new Series({
    id: 4,
    title: 'Neque Porro Quisquam Est',
    views: '2.1M',
    likes: '5.4K',
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop',
    synopsis: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
    totalChapters: 30,
    chapters: Array.from({ length: 30 }, (_, i) => ({
      num: 30 - i,
      title: `Capítulo ${30 - i}`,
      scanGroup: 'Por Scan',
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
