/**
 * Contrato de dominio: biblioteca personal del usuario en sesión
 * (guardados y progreso de lectura).
 */
export class MiBibliotecaRepository {
  /**
   * Estado compacto: ids guardados y progreso por libro.
   *
   * @returns {Promise<{guardados: string[], progreso: Array<{libroId: string, paginaActual: number}>}>}
   */
  async getEstado() {
    throw new Error('Método getEstado() no implementado.');
  }

  /** @returns {Promise<import('../../../libros/domain/models/Libro').Libro[]>} */
  async listGuardados() {
    throw new Error('Método listGuardados() no implementado.');
  }

  async guardar() {
    throw new Error('Método guardar(libroId) no implementado.');
  }

  async quitarGuardado() {
    throw new Error('Método quitarGuardado(libroId) no implementado.');
  }

  /**
   * Libros que el usuario empezó a leer, el más reciente primero.
   *
   * @returns {Promise<Array<{libro: import('../../../libros/domain/models/Libro').Libro, paginaActual: number}>>}
   */
  async listProgreso() {
    throw new Error('Método listProgreso() no implementado.');
  }

  async guardarProgreso() {
    throw new Error('Método guardarProgreso(libroId, pagina) no implementado.');
  }
}
