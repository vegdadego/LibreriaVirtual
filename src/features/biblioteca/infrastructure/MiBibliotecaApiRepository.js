import { MiBibliotecaRepository } from '../domain/repositories/MiBibliotecaRepository';
import { toLibro } from '../../libros/infrastructure/LibroApiRepository';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

/** Adaptador de `MiBibliotecaRepository` sobre la API `/me`. */
export class MiBibliotecaApiRepository extends MiBibliotecaRepository {
  async getEstado() {
    const { data } = await apiClient.get(ENDPOINTS.ME.STATE);
    return {
      guardados: data.guardados,
      progreso: data.progreso.map((p) => ({ libroId: p.libro_id, paginaActual: p.pagina_actual })),
    };
  }

  async listGuardados() {
    const res = await apiClient.get(ENDPOINTS.ME.SAVED);
    return res.data.map(toLibro);
  }

  async guardar(libroId) {
    await apiClient.put(ENDPOINTS.ME.SAVED_ONE(libroId), {});
  }

  async quitarGuardado(libroId) {
    await apiClient.delete(ENDPOINTS.ME.SAVED_ONE(libroId));
  }

  async listProgreso() {
    const res = await apiClient.get(ENDPOINTS.ME.PROGRESS);
    return res.data.map((raw) => ({ libro: toLibro(raw), paginaActual: raw.pagina_actual }));
  }

  async guardarProgreso(libroId, pagina) {
    await apiClient.put(ENDPOINTS.ME.PROGRESS_ONE(libroId), { pagina });
  }
}

export const defaultMiBibliotecaRepository = new MiBibliotecaApiRepository();
