import { UsuarioRepository } from '../domain/repositories/UsuarioRepository';
import { Usuario } from '../domain/models/Usuario';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

let mockUsuariosStorage = [
  new Usuario({
    id: 'u-1',
    nombre: 'Carlos Mendoza',
    email: 'carlos.m@universidad.edu',
    telefono: '+52 55 1234 5678',
    documento: 'EST-2024-0091',
    tipo: 'Estudiante',
    prestamosActivos: 1,
    estado: 'ACTIVO'
  }),
  new Usuario({
    id: 'u-2',
    nombre: 'María Fernanda Ruiz',
    email: 'maria.ruiz@colegio.edu',
    telefono: '+52 55 9876 5432',
    documento: 'EST-2024-0145',
    tipo: 'Estudiante',
    prestamosActivos: 1,
    estado: 'ACTIVO'
  }),
  new Usuario({
    id: 'u-3',
    nombre: 'Dr. Alejandro Morales',
    email: 'a.morales@facultad.edu',
    telefono: '+52 55 4567 8901',
    documento: 'DOC-1988-0021',
    tipo: 'Profesor / Investigador',
    prestamosActivos: 0,
    estado: 'ACTIVO'
  })
];

export class UsuarioApiRepository extends UsuarioRepository {
  async getAll() {
    try {
      const data = await apiClient.get(ENDPOINTS.USUARIOS.BASE);
      return data.map((item) => new Usuario(item));
    } catch {
      return [...mockUsuariosStorage];
    }
  }

  async getById(id) {
    try {
      const data = await apiClient.get(ENDPOINTS.USUARIOS.DETAIL(id));
      return new Usuario(data);
    } catch {
      return mockUsuariosStorage.find((u) => u.id === id) || null;
    }
  }

  async create(usuario) {
    try {
      const res = await apiClient.post(ENDPOINTS.USUARIOS.BASE, usuario);
      return new Usuario(res);
    } catch {
      const created = new Usuario({
        ...usuario,
        id: `u-${Date.now()}`,
        prestamosActivos: 0,
        estado: 'ACTIVO'
      });
      mockUsuariosStorage = [created, ...mockUsuariosStorage];
      return created;
    }
  }

  async update(id, usuario) {
    try {
      const res = await apiClient.put(ENDPOINTS.USUARIOS.DETAIL(id), usuario);
      return new Usuario(res);
    } catch {
      mockUsuariosStorage = mockUsuariosStorage.map((u) =>
        u.id === id ? new Usuario({ ...u, ...usuario, id }) : u
      );
      return new Usuario({ ...usuario, id });
    }
  }

  async delete(id) {
    try {
      await apiClient.delete(ENDPOINTS.USUARIOS.DETAIL(id));
      return true;
    } catch {
      mockUsuariosStorage = mockUsuariosStorage.filter((u) => u.id !== id);
      return true;
    }
  }
}

export const defaultUsuarioRepository = new UsuarioApiRepository();
