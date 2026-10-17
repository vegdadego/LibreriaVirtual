import { LibroRepository } from '../domain/repositories/LibroRepository';
import { Libro, PaginaLibro } from '../domain/models/Libro';
import { LibroApiRepository } from './LibroApiRepository';
import { ApiError } from '../../../services/api/errorHandler';
import { defaultDescargaRepository } from '../../descargas/infrastructure/IndexedDbDescargaRepository';
import { storage } from '../../../utils/storage';

/**
 * Indica si un error se debe a la falta de conexión (sin red o plazo agotado).
 *
 * @param {Error & {status?: number}} error
 * @returns {boolean}
 */
const isOfflineError = (error) => error?.status === 0 || error?.status === 408;

/**
 * Repositorio de libros que prefiere lo descargado en este dispositivo:
 * - las páginas de un libro descargado se leen del almacén local (sin red);
 * - la ficha de un libro se pide al servidor y, si no hay conexión, se usa la copia local;
 * - todo lo demás (catálogo, subida, texto completo) va directo a la API.
 */
export class LibroConDescargasRepository extends LibroRepository {
  /**
   * @param {LibroApiRepository} api
   * @param {import('../../descargas/domain/repositories/DescargaRepository').DescargaRepository} descargas
   * @param {() => string|null} getUserId Id del usuario en sesión.
   */
  constructor(api, descargas, getUserId) {
    super();
    this.api = api;
    this.descargas = descargas;
    this.getUserId = getUserId;
    this.paginasCache = { key: null, paginas: null };
  }

  list(filtros) {
    return this.api.list(filtros);
  }

  listMine(filtros) {
    return this.api.listMine(filtros);
  }

  update(id, datos) {
    return this.api.update(id, datos);
  }

  async remove(id) {
    await this.api.remove(id);
    this.forget(id);
  }

  getCategories() {
    return this.api.getCategories();
  }

  getTextoCompleto(id) {
    return this.api.getTextoCompleto(id);
  }

  upload(datos) {
    return this.api.upload(datos);
  }

  analyze(pdf) {
    return this.api.analyze(pdf);
  }

  stage(pdf, options) {
    return this.api.stage(pdf, options);
  }

  getStageStatus(stageId) {
    return this.api.getStageStatus(stageId);
  }

  findDuplicate(datos) {
    return this.api.findDuplicate(datos);
  }

  discardStage(stageId) {
    return this.api.discardStage(stageId);
  }

  getUploadStatus(jobId) {
    return this.api.getUploadStatus(jobId);
  }

  async getById(id) {
    try {
      return await this.api.getById(id);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      const local = await this.readLocalLibro(id);
      if (local) return local;
      throw error;
    }
  }

  async getPage(id, numero) {
    const paginas = await this.readLocalPages(id);
    if (!paginas) return this.api.getPage(id, numero);

    const index = paginas.findIndex((p) => p.pagina === numero);
    if (index === -1) {
      throw new ApiError(`El libro no tiene la página ${numero}.`, 404);
    }
    const total = paginas.length;
    const descarga = await this.descargas.obtener(this.getUserId(), id);
    return new PaginaLibro({
      libroId: id,
      titulo: descarga?.titulo ?? '',
      pagina: numero,
      texto: paginas[index].texto,
      totalPaginas: total,
      anterior: index > 0 ? paginas[index - 1].pagina : null,
      siguiente: index < total - 1 ? paginas[index + 1].pagina : null,
      // Los libros descargados tras esta función guardan su ficha con el inicio del contenido.
      inicioContenido: descarga?.libro?.inicioContenido ?? null,
    });
  }

  /**
   * Texto de un libro descargado, o `null` si no está descargado (o no hay sesión
   * / almacén local). Guarda en memoria el último libro para no releerlo en cada página.
   */
  async readLocalPages(id) {
    const userId = this.getUserId();
    if (!userId) return null;
    const key = `${userId}:${id}`;
    if (this.paginasCache.key === key) return this.paginasCache.paginas;
    try {
      const paginas = await this.descargas.obtenerPaginas(userId, id);
      // Solo se recuerdan los libros descargados; si se descarga uno nuevo se lee de nuevo.
      if (paginas) this.paginasCache = { key, paginas };
      return paginas;
    } catch {
      return null;
    }
  }

  /** Ficha de un libro descargado reconstruida desde la copia local, o `null`. */
  async readLocalLibro(id) {
    const userId = this.getUserId();
    if (!userId) return null;
    try {
      const descarga = await this.descargas.obtener(userId, id);
      if (!descarga) return null;
      return new Libro({
        ...descarga.libro,
        portadaUrl: descarga.portada ? URL.createObjectURL(descarga.portada) : null,
      });
    } catch {
      return null;
    }
  }

  /** Olvida el texto en memoria de un libro (al quitar su descarga). */
  forget(id) {
    if (this.paginasCache.key?.endsWith(`:${id}`)) this.paginasCache = { key: null, paginas: null };
  }
}

/** Repositorio de libros que usan las pantallas. */
export const defaultLibroRepository = new LibroConDescargasRepository(
  new LibroApiRepository(),
  defaultDescargaRepository,
  () => storage.get('bibliotech_user')?.id ?? null
);
