/**
 * Contrato de Dominio: LibroRepository
 * Define las operaciones que cualquier fuente de datos (API, Mock, Base de datos) debe cumplir.
 */

export class LibroRepository {
  async getAll() {
    throw new Error('Método getAll() no implementado.');
  }

  async getById(id) {
    throw new Error('Método getById(id) no implementado.');
  }

  async create(libro) {
    throw new Error('Método create(libro) no implementado.');
  }

  async update(id, libro) {
    throw new Error('Método update(id, libro) no implementado.');
  }

  async delete(id) {
    throw new Error('Método delete(id) no implementado.');
  }
}
