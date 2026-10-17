/**
 * Entidad de dominio: un libro descargado en este dispositivo para leerlo sin conexión.
 */
export class Descarga {
  /**
   * @param {Object} data
   * @param {string} data.libroId
   * @param {string} data.titulo
   * @param {string[]} [data.autores]
   * @param {number} data.totalPaginas
   * @param {number} data.tamano Peso del PDF generado, en bytes.
   * @param {string} data.fecha Fecha ISO de la descarga.
   * @param {Blob|null} [data.portada] Imagen de portada guardada.
   * @param {Blob} data.pdf PDF generado a partir del texto.
   * @param {Object} data.libro Copia de los metadatos del libro (ficha sin conexión).
   */
  constructor({ libroId, titulo, autores = [], totalPaginas, tamano, fecha, portada = null, pdf, libro }) {
    this.libroId = String(libroId);
    this.titulo = titulo;
    this.autores = autores;
    this.totalPaginas = totalPaginas;
    this.tamano = tamano;
    this.fecha = fecha;
    this.portada = portada;
    this.pdf = pdf;
    this.libro = libro;
  }
}
