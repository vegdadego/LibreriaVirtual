/**
 * Catálogo centralizado de endpoints de la API.
 * Cada ruta se corresponde con `docs/reference/api.md`.
 */

export const ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },

  // Catálogo y lectura de libros
  BOOKS: {
    BASE: '/books',
    MINE: '/books/mios',
    DETAIL: (id) => `/books/${id}`,
    CATEGORIES: '/books/categorias',
    PAGE: (id, page) => `/books/${id}/paginas/${page}`,
    TEXT: (id) => `/books/${id}/texto`,
    COVER: (id) => `/books/${id}/portada`,
    UPLOAD: '/books/upload',
    ANALYZE: '/books/analyze',
    DUPLICATE: '/books/duplicado',
    STAGE: '/books/stage',
    STAGE_ONE: (stageId) => `/books/stage/${stageId}`,
    STAGE_UPLOADS: '/books/stage/uploads',
    STAGE_UPLOAD: (uploadId) => `/books/stage/uploads/${uploadId}`,
    STAGE_UPLOAD_CHUNK: (uploadId, index) => `/books/stage/uploads/${uploadId}/${index}`,
    STAGE_UPLOAD_COMPLETE: (uploadId) => `/books/stage/uploads/${uploadId}/complete`,
    UPLOAD_STATUS: (jobId) => `/books/uploads/${jobId}`,
  },

  // Biblioteca personal del usuario en sesión
  ME: {
    STATE: '/me/estado',
    SAVED: '/me/guardados',
    SAVED_ONE: (id) => `/me/guardados/${id}`,
    PROGRESS: '/me/progreso',
    PROGRESS_ONE: (id) => `/me/progreso/${id}`,
    FOLDERS: '/me/carpetas',
    FOLDER: (id) => `/me/carpetas/${id}`,
    FOLDER_BOOK: (id, bookId) => `/me/carpetas/${id}/libros/${bookId}`,
  },
};
