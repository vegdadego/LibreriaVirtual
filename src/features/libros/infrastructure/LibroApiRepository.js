import { LibroRepository } from '../domain/repositories/LibroRepository';
import { Libro } from '../domain/models/Libro';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';

let mockLibrosStorage = [
  new Libro({
    id: '1',
    titulo: 'Cien Años de Soledad',
    autor: 'Gabriel García Márquez',
    isbn: '978-0307474728',
    categoria: 'Novela / Realismo Mágico',
    editorial: 'Editorial Sudamericana',
    año: 1967,
    copiasTotales: 5,
    copiasDisponibles: 3
  }),
  new Libro({
    id: '2',
    titulo: 'Don Quijote de la Mancha',
    autor: 'Miguel de Cervantes',
    isbn: '978-8424116286',
    categoria: 'Clásico Literario',
    editorial: 'Francisco de Robles',
    año: 1605,
    copiasTotales: 3,
    copiasDisponibles: 1
  }),
  new Libro({
    id: '3',
    titulo: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    autor: 'Robert C. Martin',
    isbn: '978-0132350884',
    categoria: 'Tecnología y Software',
    editorial: 'Prentice Hall',
    año: 2008,
    copiasTotales: 4,
    copiasDisponibles: 0
  })
];

export class LibroApiRepository extends LibroRepository {
  async getAll() {
    try {
      const data = await apiClient.get(ENDPOINTS.LIBROS.BASE);
      return data.map((item) => new Libro(item));
    } catch {
      // Fallback offline en desarrollo mientras se inicia el backend
      return [...mockLibrosStorage];
    }
  }

  async getById(id) {
    try {
      const data = await apiClient.get(ENDPOINTS.LIBROS.DETAIL(id));
      return new Libro(data);
    } catch {
      return mockLibrosStorage.find((l) => l.id === String(id)) || null;
    }
  }

  async create(libro) {
    try {
      const res = await apiClient.post(ENDPOINTS.LIBROS.BASE, libro);
      return new Libro(res);
    } catch {
      const created = new Libro({
        ...libro,
        id: String(Date.now()),
        copiasDisponibles: libro.copiasTotales
      });
      mockLibrosStorage = [created, ...mockLibrosStorage];
      return created;
    }
  }

  async update(id, libro) {
    try {
      const res = await apiClient.put(ENDPOINTS.LIBROS.DETAIL(id), libro);
      return new Libro(res);
    } catch {
      mockLibrosStorage = mockLibrosStorage.map((l) =>
        l.id === String(id) ? new Libro({ ...l, ...libro, id: String(id) }) : l
      );
      return new Libro({ ...libro, id: String(id) });
    }
  }

  async delete(id) {
    try {
      await apiClient.delete(ENDPOINTS.LIBROS.DETAIL(id));
      return true;
    } catch {
      mockLibrosStorage = mockLibrosStorage.filter((l) => l.id !== String(id));
      return true;
    }
  }

  getCategorias() {
    return [
      'Todas',
      'Novela / Realismo Mágico',
      'Clásico Literario',
      'Tecnología y Software',
      'Ciencia e Historia',
      'Filosofía y Ensayo'
    ];
  }
}

export const defaultLibroRepository = new LibroApiRepository();
