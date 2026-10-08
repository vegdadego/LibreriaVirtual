/**
 * Entidad de Dominio: Usuario / Lector
 * Define los atributos y validaciones puras del lector de biblioteca.
 */

export class Usuario {
  constructor({
    id = null,
    nombre,
    email,
    telefono = '',
    documento,
    tipo = 'Estudiante',
    prestamosActivos = 0,
    estado = 'ACTIVO'
  }) {
    this.id = id ? String(id) : null;
    this.nombre = nombre;
    this.email = email;
    this.telefono = telefono;
    this.documento = documento;
    this.tipo = tipo;
    this.prestamosActivos = Number(prestamosActivos || 0);
    this.estado = estado;
  }

  tienePrestamosPendientes() {
    return this.prestamosActivos > 0;
  }

  validar() {
    if (!this.nombre || this.nombre.trim() === '') {
      throw new Error('El nombre del usuario es obligatorio.');
    }
    if (!this.email || !this.email.includes('@')) {
      throw new Error('El correo electrónico ingresado no es válido.');
    }
    if (!this.documento || this.documento.trim() === '') {
      throw new Error('El documento o matrícula de identificación es obligatorio.');
    }
    return true;
  }
}
