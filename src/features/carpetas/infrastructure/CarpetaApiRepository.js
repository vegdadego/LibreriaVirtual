import { CarpetaRepository } from '../domain/repositories/CarpetaRepository';
import { Carpeta } from '../domain/models/Carpeta';
import { toLibro } from '../../libros/infrastructure/LibroApiRepository';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

/**
 * Convierte una carpeta de la API en la entidad de dominio.
 *
 * @param {Object} raw
 * @returns {Carpeta}
 */
function toCarpeta(raw) {
  return new Carpeta({
    id: raw._id,
    nombre: raw.nombre,
    descripcion: raw.descripcion,
    libroIds: raw.libro_ids || [],
    previews: (raw.previews || []).map((p) => ({
      id: p._id,
      titulo: p.titulo,
      portadaUrl: p.tiene_portada ? apiClient.url(ENDPOINTS.BOOKS.COVER(p._id)) : null,
    })),
    libros: raw.libros ? raw.libros.map(toLibro) : null,
  });
}

/** Adaptador de `CarpetaRepository` sobre la API `/me/carpetas`. */
export class CarpetaApiRepository extends CarpetaRepository {
  async list() {
    const res = await apiClient.get(ENDPOINTS.ME.FOLDERS);
    return res.data.map(toCarpeta);
  }

  async getById(id) {
    const res = await apiClient.get(ENDPOINTS.ME.FOLDER(id));
    return toCarpeta(res.data);
  }

  async create({ nombre, descripcion, libroId }) {
    const res = await apiClient.post(ENDPOINTS.ME.FOLDERS, {
      nombre,
      descripcion,
      ...(libroId ? { libro_id: libroId } : {}),
    });
    return toCarpeta(res.data);
  }

  async update(id, cambios) {
    const res = await apiClient.put(ENDPOINTS.ME.FOLDER(id), cambios);
    return toCarpeta(res.data);
  }

  async remove(id) {
    await apiClient.delete(ENDPOINTS.ME.FOLDER(id));
  }

  async addBook(carpetaId, libroId) {
    await apiClient.put(ENDPOINTS.ME.FOLDER_BOOK(carpetaId, libroId), {});
  }

  async removeBook(carpetaId, libroId) {
    await apiClient.delete(ENDPOINTS.ME.FOLDER_BOOK(carpetaId, libroId));
  }
}

export const defaultCarpetaRepository = new CarpetaApiRepository();
