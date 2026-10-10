import { PrestamoRepository } from '../domain/repositories/PrestamoRepository';
import { Prestamo } from '../domain/models/Prestamo';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

let mockPrestamosStorage = [
  new Prestamo({
    id: 'p-101',
    libroId: '1',
    libroTitulo: 'Lorem Ipsum Dolor Sit Amet',
    usuarioNombre: 'Carlos Mendoza',
    usuarioEmail: 'carlos.m@universidad.edu',
    fechaPrestamo: '2026-09-28',
    fechaDevolucionEsperada: '2026-10-12',
    estado: 'ACTIVO'
  }),
  new Prestamo({
    id: 'p-102',
    libroId: '2',
    libroTitulo: 'Consectetur Adipiscing Elit',
    usuarioNombre: 'María Fernanda Ruiz',
    usuarioEmail: 'maria.ruiz@colegio.edu',
    fechaPrestamo: '2026-09-20',
    fechaDevolucionEsperada: '2026-10-04',
    estado: 'VENCIDO'
  })
];

export class PrestamoApiRepository extends PrestamoRepository {
  async getAll() {
    try {
      const data = await apiClient.get(ENDPOINTS.PRESTAMOS.BASE);
      return data.map((item) => new Prestamo(item));
    } catch {
      return [...mockPrestamosStorage];
    }
  }

  async create(prestamo) {
    try {
      const res = await apiClient.post(ENDPOINTS.PRESTAMOS.BASE, prestamo);
      return new Prestamo(res);
    } catch {
      const created = new Prestamo({
        ...prestamo,
        id: `p-${Date.now()}`,
        fechaPrestamo: new Date().toISOString().split('T')[0]
      });
      mockPrestamosStorage = [created, ...mockPrestamosStorage];
      return created;
    }
  }

  async devolver(id) {
    try {
      await apiClient.post(ENDPOINTS.PRESTAMOS.DEVOLVER(id), {});
      return true;
    } catch {
      mockPrestamosStorage = mockPrestamosStorage.map((p) =>
        p.id === id
          ? new Prestamo({
              ...p,
              estado: 'DEVUELTO',
              fechaDevolucionReal: new Date().toISOString().split('T')[0]
            })
          : p
      );
      return true;
    }
  }
}

export const defaultPrestamoRepository = new PrestamoApiRepository();
