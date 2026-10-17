/**
 * Contrato de dominio: LibroRepository.
 * Cualquier fuente de datos (API, caché sin conexión) debe cumplirlo.
 */
export class LibroRepository {
  /**
   * @param {{busqueda?: string, categoria?: string, autor?: string, saga?: string, page?: number, limit?: number}} [filtros]
   * @returns {Promise<{libros: import('../models/Libro').Libro[], total: number, page: number, limit: number}>}
   */
  async list() {
    throw new Error('Método list() no implementado.');
  }

  /** @returns {Promise<import('../models/Libro').Libro>} */
  async getById() {
    throw new Error('Método getById(id) no implementado.');
  }

  /** @returns {Promise<import('../models/Libro').PaginaLibro>} */
  async getPage() {
    throw new Error('Método getPage(id, numero) no implementado.');
  }

  /**
   * Texto de todas las páginas (para descargar el libro). Requiere sesión.
   *
   * @returns {Promise<{titulo: string, paginas: Array<{pagina: number, texto: string}>}>}
   */
  async getTextoCompleto() {
    throw new Error('Método getTextoCompleto(id) no implementado.');
  }

  /** @returns {Promise<string[]>} */
  async getCategories() {
    throw new Error('Método getCategories() no implementado.');
  }

  /**
   * Envía un PDF con sus metadatos para procesarlo en segundo plano.
   *
   * @param {Object} datos Ver `LibroApiRepository.upload`.
   * @returns {Promise<{jobId: string}>}
   */
  async upload() {
    throw new Error('Método upload(datos) no implementado.');
  }

  /**
   * Lee un PDF y propone los datos del libro (autores, categorías, editorial...).
   *
   * @returns {Promise<Object>} Solo los campos que se pudieron detectar, más `fuentes`.
   */
  async analyze() {
    throw new Error('Método analyze(pdf) no implementado.');
  }

  /**
   * Consulta el estado de una carga.
   *
   * @returns {Promise<{estado: string, progreso: {paginas_procesadas: number, total_paginas: number|null}, libroId: string|null, error: {code: string, message: string, libro_id?: string}|null}>}
   */
  async getUploadStatus() {
    throw new Error('Método getUploadStatus(jobId) no implementado.');
  }
}
