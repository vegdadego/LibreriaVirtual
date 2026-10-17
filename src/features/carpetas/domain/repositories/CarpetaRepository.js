/**
 * Contrato de dominio: carpetas de libros del usuario en sesión.
 */
export class CarpetaRepository {
  /** @returns {Promise<import('../models/Carpeta').Carpeta[]>} La modificada más recientemente primero. */
  async list() {
    throw new Error('Método list() no implementado.');
  }

  /** @returns {Promise<import('../models/Carpeta').Carpeta>} Con `libros` completos. */
  async getById() {
    throw new Error('Método getById(id) no implementado.');
  }

  /**
   * @param {{nombre: string, descripcion?: string, libroId?: string}} datos
   * @returns {Promise<import('../models/Carpeta').Carpeta>}
   */
  async create() {
    throw new Error('Método create(datos) no implementado.');
  }

  /**
   * @param {string} id
   * @param {{nombre?: string, descripcion?: string}} cambios
   * @returns {Promise<import('../models/Carpeta').Carpeta>}
   */
  async update() {
    throw new Error('Método update(id, cambios) no implementado.');
  }

  async remove() {
    throw new Error('Método remove(id) no implementado.');
  }

  async addBook() {
    throw new Error('Método addBook(carpetaId, libroId) no implementado.');
  }

  async removeBook() {
    throw new Error('Método removeBook(carpetaId, libroId) no implementado.');
  }
}
