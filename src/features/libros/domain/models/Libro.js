/**
 * Entidad de Dominio: Libro
 * Contiene la estructura y reglas de negocio puras, sin depender de la UI ni de la API.
 */

export class Libro {
  constructor({
    id = null,
    titulo,
    autor,
    isbn,
    categoria,
    editorial = '',
    año = new Date().getFullYear(),
    copiasTotales = 1,
    copiasDisponibles = 1,
    estado = 'DISPONIBLE'
  }) {
    this.id = id ? String(id) : null;
    this.titulo = titulo;
    this.autor = autor;
    this.isbn = isbn;
    this.categoria = categoria;
    this.editorial = editorial;
    this.año = Number(año);
    this.copiasTotales = Number(copiasTotales);
    this.copiasDisponibles = Number(copiasDisponibles);
    this.estado = this.copiasDisponibles > 0 ? 'DISPONIBLE' : 'AGOTADO';
  }

  estaDisponible() {
    return this.copiasDisponibles > 0;
  }

  validar() {
    if (!this.titulo || this.titulo.trim() === '') {
      throw new Error('El título del libro es obligatorio.');
    }
    if (!this.autor || this.autor.trim() === '') {
      throw new Error('El autor del libro es obligatorio.');
    }
    if (!this.isbn || this.isbn.trim() === '') {
      throw new Error('El ISBN del libro es obligatorio.');
    }
    if (this.copiasTotales < 1) {
      throw new Error('Debe existir al menos 1 copia en stock.');
    }
    return true;
  }
}
