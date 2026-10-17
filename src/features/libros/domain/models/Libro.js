/**
 * Entidad de dominio: Libro del catálogo.
 * No depende de la UI ni de la API.
 */
export class Libro {
  /**
   * @param {Object} data
   * @param {string} data.id Identificador del libro.
   * @param {string} data.titulo
   * @param {string[]} [data.autores] Nombres de los autores.
   * @param {string[]} [data.categorias]
   * @param {string} [data.sinopsis]
   * @param {string} [data.idioma]
   * @param {string} [data.editorial]
   * @param {number} [data.numeroEdicion]
   * @param {string|null} [data.fechaPublicacion] Fecha ISO.
   * @param {{nombre: string, numero: number}|null} [data.saga]
   * @param {number} [data.totalPaginas]
   * @param {string|null} [data.portadaUrl] URL de la portada, o `null` si no tiene.
   */
  constructor({
    id,
    titulo,
    autores = [],
    categorias = [],
    sinopsis = '',
    idioma = 'es',
    editorial = '',
    numeroEdicion = 1,
    fechaPublicacion = null,
    saga = null,
    totalPaginas = 0,
    portadaUrl = null,
  }) {
    this.id = String(id);
    this.titulo = titulo;
    this.autores = autores;
    this.categorias = categorias;
    this.sinopsis = sinopsis;
    this.idioma = idioma;
    this.editorial = editorial;
    this.numeroEdicion = numeroEdicion;
    this.fechaPublicacion = fechaPublicacion;
    this.saga = saga;
    this.totalPaginas = totalPaginas;
    this.portadaUrl = portadaUrl;
  }

  /** Autores separados por coma, o `''` si no hay. */
  get autoresTexto() {
    return this.autores.join(', ');
  }
}

/**
 * Una página de texto de un libro, con la navegación a sus vecinas.
 */
export class PaginaLibro {
  /**
   * @param {Object} data
   * @param {string} data.libroId
   * @param {string} data.titulo
   * @param {number} data.pagina Número de página (desde 1).
   * @param {string} data.texto Texto con saltos de línea; párrafos separados por línea en blanco.
   * @param {number} data.totalPaginas
   * @param {number|null} data.anterior
   * @param {number|null} data.siguiente
   */
  constructor({ libroId, titulo, pagina, texto, totalPaginas, anterior, siguiente }) {
    this.libroId = String(libroId);
    this.titulo = titulo;
    this.pagina = pagina;
    this.texto = texto;
    this.totalPaginas = totalPaginas;
    this.anterior = anterior;
    this.siguiente = siguiente;
  }
}
