import { DashboardRepository } from '../domain/repositories/DashboardRepository';
import { DashboardMetrics } from '../domain/models/DashboardMetrics';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

export class DashboardApiRepository extends DashboardRepository {
  async getMetricas() {
    try {
      const data = await apiClient.get(ENDPOINTS.DASHBOARD.METRICAS);
      return new DashboardMetrics(data);
    } catch {
      return new DashboardMetrics({
        totalLibros: 12,
        prestamosActivos: 5,
        prestamosVencidos: 1,
        totalUsuarios: 18,
        ejemplaresDisponibles: 28
      });
    }
  }

  async getActividadReciente() {
    try {
      return await apiClient.get(ENDPOINTS.DASHBOARD.ACTIVIDAD_RECIENTE);
    } catch {
      return [
        {
          id: 'act-1',
          tipo: 'PRESTAMO',
          descripcion: 'Préstamo de "Cien Años de Soledad" a Carlos Mendoza',
          fecha: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 'act-2',
          tipo: 'DEVOLUCION',
          descripcion: 'Devolución de "El Alquimista" por Ana Silva',
          fecha: new Date(Date.now() - 1000 * 60 * 180).toISOString()
        },
        {
          id: 'act-3',
          tipo: 'LIBRO_NUEVO',
          descripcion: 'Se agregaron 3 ejemplares de "Clean Code"',
          fecha: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        }
      ];
    }
  }
}

export const defaultDashboardRepository = new DashboardApiRepository();
