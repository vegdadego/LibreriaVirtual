/**
 * Contrato de dominio: almacén local de libros descargados.
 * Todo está separado por usuario para que una cuenta no vea las descargas de otra
 * en el mismo dispositivo.
 */
export class DescargaRepository {
  /**
   * Guarda (o reemplaza) una descarga con el texto de sus páginas.
   *
   * @param {string} usuarioId
   * @param {import('../models/Descarga').Descarga} descarga
   * @param {Array<{pagina: number, texto: string}>} paginas
   * @returns {Promise<void>}
   */
  async guardar() {
    throw new Error('Método guardar(usuarioId, descarga, paginas) no implementado.');
  }

  /** @returns {Promise<import('../models/Descarga').Descarga|null>} */
  async obtener() {
    throw new Error('Método obtener(usuarioId, libroId) no implementado.');
  }

  /** @returns {Promise<Array<{pagina: number, texto: string}>|null>} Texto de las páginas, o `null` si no hay descarga. */
  async obtenerPaginas() {
    throw new Error('Método obtenerPaginas(usuarioId, libroId) no implementado.');
  }

  /** @returns {Promise<import('../models/Descarga').Descarga[]>} Más recientes primero. */
  async listar() {
    throw new Error('Método listar(usuarioId) no implementado.');
  }

  /** @returns {Promise<string[]>} Ids de los libros descargados. */
  async ids() {
    throw new Error('Método ids(usuarioId) no implementado.');
  }

  /** @returns {Promise<void>} */
  async eliminar() {
    throw new Error('Método eliminar(usuarioId, libroId) no implementado.');
  }
}
