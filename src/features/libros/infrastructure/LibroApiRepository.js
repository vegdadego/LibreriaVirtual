import { LibroRepository } from '../domain/repositories/LibroRepository';
import { Libro, PaginaLibro } from '../domain/models/Libro';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

/**
 * Convierte un libro del backend (`GET /books`) en la entidad de dominio.
 *
 * @param {Object} raw Documento de la API.
 * @returns {Libro}
 */
export function toLibro(raw) {
  const id = raw._id ?? raw.id;
  return new Libro({
    id,
    titulo: raw.titulo,
    autores: (raw.autores || []).map((a) => a.nombre),
    categorias: raw.categorias || [],
    sinopsis: raw.sinopsis || '',
    idioma: raw.idioma || 'es',
    editorial: raw.empresa_edicion || '',
    numeroEdicion: raw.numero_edicion ?? 1,
    fechaPublicacion: raw.fecha_publicacion || null,
    saga: raw.saga?.nombre_saga
      ? { nombre: raw.saga.nombre_saga, numero: raw.saga.numero_en_saga ?? 1 }
      : null,
    totalPaginas: raw.total_paginas ?? 0,
    inicioContenido: raw.inicio_contenido > 0 ? raw.inicio_contenido : null,
    // El parámetro `v` invalida la caché del navegador si el libro se reemplaza.
    portadaUrl: raw.tiene_portada
      ? `${apiClient.url(ENDPOINTS.BOOKS.COVER(id))}?v=${encodeURIComponent(raw.updatedAt || '')}`
      : null,
  });
}

const PAGE_CACHE_SIZE = 40;

/** Adaptador de `LibroRepository` sobre la API REST de `/books`. */
export class LibroApiRepository extends LibroRepository {
  pageCache = new Map();

  async list(filtros = {}) {
    return this.fetchListing(ENDPOINTS.BOOKS.BASE, filtros);
  }

  async listMine(filtros = {}) {
    return this.fetchListing(ENDPOINTS.BOOKS.MINE, filtros);
  }

  /** Pide un listado paginado (`GET /books` o `GET /books/mios`) y lo convierte a entidades. */
  async fetchListing(endpoint, filtros) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value).trim());
      }
    });
    const query = params.toString();
    const res = await apiClient.get(`${endpoint}${query ? `?${query}` : ''}`);
    return {
      libros: res.data.map(toLibro),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  /**
   * Edita los metadatos (`PUT /books/:id`). El texto del libro no cambia.
   *
   * @param {string} id
   * @param {Record<string, any>} datos Campos del backend (`titulo`, `autores`, `categorias`, `sinopsis`...).
   * @returns {Promise<Libro>}
   */
  async update(id, datos) {
    const res = await apiClient.put(ENDPOINTS.BOOKS.DETAIL(id), datos);
    this.forgetPages(id);
    return toLibro(res.data);
  }

  async remove(id) {
    await apiClient.delete(ENDPOINTS.BOOKS.DETAIL(id));
    this.forgetPages(id);
  }

  /** Descarta las páginas en caché de un libro (cambió o ya no existe). */
  forgetPages(id) {
    [...this.pageCache.keys()].filter((key) => key.startsWith(`${id}:`)).forEach((key) => this.pageCache.delete(key));
  }

  async getById(id) {
    const res = await apiClient.get(ENDPOINTS.BOOKS.DETAIL(id));
    return toLibro(res.data);
  }

  /**
   * Devuelve una página; las ya pedidas se reutilizan para que la precarga
   * de la siguiente página haga instantáneo el cambio.
   */
  getPage(id, numero) {
    const key = `${id}:${numero}`;
    const cached = this.pageCache.get(key);
    if (cached) return cached;

    const request = apiClient
      .get(ENDPOINTS.BOOKS.PAGE(id, numero))
      .then(
        ({ data }) =>
          new PaginaLibro({
            libroId: data.libro_id,
            titulo: data.titulo,
            pagina: data.pagina,
            texto: data.texto,
            totalPaginas: data.total_paginas,
            anterior: data.anterior,
            siguiente: data.siguiente,
            inicioContenido: data.inicio_contenido > 0 ? data.inicio_contenido : null,
          })
      )
      .catch((error) => {
        this.pageCache.delete(key);
        throw error;
      });

    this.pageCache.set(key, request);
    if (this.pageCache.size > PAGE_CACHE_SIZE) {
      this.pageCache.delete(this.pageCache.keys().next().value);
    }
    return request;
  }

  async getTextoCompleto(id) {
    const { data } = await apiClient.get(ENDPOINTS.BOOKS.TEXT(id), {}, { timeout: 60000 });
    return { titulo: data.titulo, paginas: data.paginas };
  }

  async getCategories() {
    const res = await apiClient.get(ENDPOINTS.BOOKS.CATEGORIES);
    return res.data;
  }

  /**
   * Sube un PDF **una sola vez** a una preparación del servidor (`POST /books/stage`): lo analiza,
   * dibuja su portada y empieza a leer su texto mientras se rellena el formulario.
   *
   * @param {File} pdf Archivo PDF.
   * @param {Object} [options]
   * @param {(avance: {cargado: number, total: number}) => void} [options.onProgress] Avance de la subida.
   * @param {AbortSignal} [options.signal] Cancela la subida.
   * @returns {Promise<{
   *   stageId: string,
   *   estado: 'leyendo'|'listo'|'error',
   *   progreso: {paginas_procesadas: number, total_paginas: number|null},
   *   analisis: Object,
   *   portada: {mime: string, base64: string}|null
   * }>}
   */
  async stage(pdf, { onProgress, signal } = {}) {
    const form = new FormData();
    form.append('pdf', pdf, pdf.name);
    const res = await apiClient.postFormWithProgress(ENDPOINTS.BOOKS.STAGE, form, { onProgress, signal });
    return res.data;
  }

  /**
   * Avance de la lectura del texto de un PDF preparado.
   *
   * @param {string} stageId
   * @returns {Promise<{estado: 'leyendo'|'listo'|'error', progreso: {paginas_procesadas: number, total_paginas: number|null}, error?: {code: string, message: string}}>}
   */
  async getStageStatus(stageId) {
    const res = await apiClient.get(ENDPOINTS.BOOKS.STAGE_ONE(stageId));
    return res.data;
  }

  /**
   * Pregunta al servidor si el libro del formulario ya existe (`GET /books/duplicado`): por título,
   * edición, idioma y autores, y por el propio PDF si hay un `stageId`.
   *
   * @param {{titulo: string, autores?: string, numeroEdicion?: string, idioma?: string, stageId?: string|null}} datos
   * @returns {Promise<{libroId: string, titulo: string}|null>}
   */
  async findDuplicate({ titulo, autores, numeroEdicion, idioma, stageId }) {
    const params = new URLSearchParams({ titulo });
    if (autores) params.set('autores', autores);
    if (numeroEdicion) params.set('numero_edicion', numeroEdicion);
    if (idioma) params.set('idioma', idioma);
    if (stageId) params.set('stage_id', stageId);
    const res = await apiClient.get(`${ENDPOINTS.BOOKS.DUPLICATE}?${params}`);
    const found = res.data.duplicado;
    return found ? { libroId: found.libro_id, titulo: found.titulo } : null;
  }

  /** Descarta un PDF preparado (se eligió otro archivo o se canceló). No falla si ya no existe. */
  async discardStage(stageId) {
    await apiClient.delete(ENDPOINTS.BOOKS.STAGE_ONE(stageId));
  }

  /**
   * Guarda un libro (`POST /books/upload`, multipart). Se envía el `stageId` de un PDF ya
   * preparado (solo viajan los datos) o, sin preparación, el propio `pdf`.
   *
   * @param {Object} datos
   * @param {string} [datos.stageId] PDF preparado con `stage`.
   * @param {boolean} [datos.usarPortadaPdf] Con `stageId`: usar la portada que dibujó el servidor.
   * @param {File} [datos.pdf] Archivo PDF (si no hay `stageId`).
   * @param {Blob} [datos.portada] Imagen de portada propia (JPEG); gana sobre la del PDF.
   * @param {string} datos.titulo
   * @param {Record<string, string>} [datos.metadatos] Resto de campos de texto (sinopsis, autores, categorias...).
   * @returns {Promise<{jobId: string}>}
   */
  async upload({ stageId, usarPortadaPdf, pdf, portada, titulo, metadatos = {} }) {
    const form = new FormData();
    if (stageId) {
      form.append('stage_id', stageId);
      if (usarPortadaPdf) form.append('usar_portada_pdf', '1');
    } else {
      form.append('pdf', pdf, pdf.name);
    }
    if (portada) form.append('portada', portada, 'portada.jpg');
    form.append('titulo', titulo);
    Object.entries(metadatos).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        form.append(key, String(value).trim());
      }
    });
    const res = await apiClient.postForm(ENDPOINTS.BOOKS.UPLOAD, form);
    return { jobId: res.data.jobId };
  }

  /**
   * Pide al servidor que lea el PDF y proponga los datos del libro
   * (`POST /books/analyze`). No guarda nada.
   *
   * @param {File} pdf Archivo PDF.
   * @returns {Promise<Object>} Campos detectados (ver `docs/reference/api.md`); solo vienen los que se pudieron detectar.
   */
  async analyze(pdf) {
    const form = new FormData();
    form.append('pdf', pdf, pdf.name);
    const res = await apiClient.postForm(ENDPOINTS.BOOKS.ANALYZE, form);
    return res.data;
  }

  async getUploadStatus(jobId) {
    const { data } = await apiClient.get(ENDPOINTS.BOOKS.UPLOAD_STATUS(jobId));
    return {
      estado: data.estado,
      progreso: data.progreso,
      libroId: data.libro_id ?? null,
      error: data.error ?? null,
    };
  }
}

export const defaultLibroRepository = new LibroApiRepository();
