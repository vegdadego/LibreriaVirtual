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
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value).trim());
      }
    });
    const query = params.toString();
    const res = await apiClient.get(`${ENDPOINTS.BOOKS.BASE}${query ? `?${query}` : ''}`);
    return {
      libros: res.data.map(toLibro),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
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
   * Sube un PDF (`POST /books/upload`, multipart).
   *
   * @param {Object} datos
   * @param {File} datos.pdf Archivo PDF.
   * @param {Blob} [datos.portada] Imagen de portada (JPEG).
   * @param {string} datos.titulo
   * @param {Record<string, string>} [datos.metadatos] Resto de campos de texto (sinopsis, autores, categorias...).
   * @returns {Promise<{jobId: string}>}
   */
  async upload({ pdf, portada, titulo, metadatos = {} }) {
    const form = new FormData();
    form.append('pdf', pdf, pdf.name);
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
