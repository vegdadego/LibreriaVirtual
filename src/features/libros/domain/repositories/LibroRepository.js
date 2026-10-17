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

  /**
   * Libros que gestiona el usuario en sesión: los que subió (un `admin` ve todos). Requiere sesión.
   *
   * @param {{busqueda?: string, page?: number, limit?: number}} [filtros]
   * @returns {Promise<{libros: import('../models/Libro').Libro[], total: number, page: number, limit: number}>}
   */
  async listMine() {
    throw new Error('Método listMine() no implementado.');
  }

  /**
   * Edita los metadatos de un libro (solo su dueño o un admin).
   *
   * @returns {Promise<import('../models/Libro').Libro>}
   */
  async update() {
    throw new Error('Método update(id, datos) no implementado.');
  }

  /**
   * Elimina un libro con su texto y su portada (solo su dueño o un admin).
   *
   * @returns {Promise<void>}
   */
  async remove() {
    throw new Error('Método remove(id) no implementado.');
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
   * Sube un PDF una sola vez a una preparación: devuelve el análisis, la portada y empieza a leer el texto.
   *
   * @param {File} pdf
   * @param {{onProgress?: Function, signal?: AbortSignal}} [options] Ver `LibroApiRepository.stage`.
   * @returns {Promise<{stageId: string, estado: string, progreso: Object, analisis: Object, portada: {mime: string, base64: string}|null}>}
   */
  async stage() {
    throw new Error('Método stage(pdf) no implementado.');
  }

  /**
   * Avance de la lectura del texto de un PDF preparado.
   *
   * @returns {Promise<{estado: string, progreso: Object, error?: {code: string, message: string}}>}
   */
  async getStageStatus() {
    throw new Error('Método getStageStatus(stageId) no implementado.');
  }

  /**
   * Pregunta si el libro del formulario ya está en la biblioteca.
   *
   * @param {{titulo: string, autores?: string, numeroEdicion?: string, idioma?: string, stageId?: string|null}} datos
   * @returns {Promise<{libroId: string, titulo: string}|null>} El libro existente, o `null`.
   */
  async findDuplicate() {
    throw new Error('Método findDuplicate(datos) no implementado.');
  }

  /** Descarta un PDF preparado. */
  async discardStage() {
    throw new Error('Método discardStage(stageId) no implementado.');
  }

  /**
   * Envía los datos de un libro (con el `stageId` de un PDF preparado, o con el propio PDF)
   * para guardarlo en segundo plano.
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
