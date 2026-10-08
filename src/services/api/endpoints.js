/**
 * Catálogo centralizado de endpoints de la API (Backend de Olympus Scans).
 * Desacoplado para que al conectar el backend solo se verifiquen estas rutas.
 */

export const ENDPOINTS = {
  // Autenticación de Lectores
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },

  // Gestión y Catálogo de Series / Manhwas
  SERIES: {
    BASE: '/series',
    DETAIL: (id) => `/series/${id}`,
    FEATURED: '/series/destacada',
    CHAPTERS: (id) => `/series/${id}/capitulos`,
    CHAPTER_PAGES: (id, num) => `/series/${id}/capitulos/${num}`,
    COMMENTS: (id) => `/series/${id}/comentarios`,
    BUSCAR: '/series/buscar',
    LIKE: (id) => `/series/${id}/like`,
    FOLLOW: (id) => `/series/${id}/seguir`,
  }
};
