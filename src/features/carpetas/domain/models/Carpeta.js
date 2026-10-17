/**
 * Entidad de dominio: carpeta de libros de un usuario (como una lista de reproducción).
 */
export class Carpeta {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} data.nombre
   * @param {string} [data.descripcion]
   * @param {string[]} [data.libroIds] Ids de los libros, en orden de llegada.
   * @param {Array<{id: string, titulo: string, portadaUrl: string|null}>} [data.previews] Libros para el mosaico (hasta 4).
   * @param {import('../../../libros/domain/models/Libro').Libro[]} [data.libros] Libros completos (solo en el detalle).
   */
  constructor({ id, nombre, descripcion = '', libroIds = [], previews = [], libros = null }) {
    this.id = String(id);
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.libroIds = libroIds;
    this.previews = previews;
    this.libros = libros;
  }

  /** Número de libros en la carpeta. */
  get totalLibros() {
    return this.libroIds.length;
  }

  /**
   * Indica si la carpeta contiene un libro.
   *
   * @param {string} libroId
   * @returns {boolean}
   */
  contiene(libroId) {
    return this.libroIds.includes(String(libroId));
  }
}
