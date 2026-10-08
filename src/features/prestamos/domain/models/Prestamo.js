/**
 * Entidad de Dominio: Prestamo
 * Reglas de negocio puras para la circulación y plazos de préstamos.
 */

export class Prestamo {
  constructor({
    id = null,
    libroId,
    libroTitulo,
    usuarioNombre,
    usuarioEmail,
    fechaPrestamo = new Date().toISOString().split('T')[0],
    fechaDevolucionEsperada,
    fechaDevolucionReal = null,
    estado = 'ACTIVO'
  }) {
    this.id = id ? String(id) : null;
    this.libroId = String(libroId || '');
    this.libroTitulo = libroTitulo;
    this.usuarioNombre = usuarioNombre;
    this.usuarioEmail = usuarioEmail;
    this.fechaPrestamo = fechaPrestamo;
    this.fechaDevolucionEsperada = fechaDevolucionEsperada;
    this.fechaDevolucionReal = fechaDevolucionReal;
    this.estado = this.calcularEstado(estado);
  }

  calcularEstado(estadoActual) {
    if (this.fechaDevolucionReal || estadoActual === 'DEVUELTO') {
      return 'DEVUELTO';
    }
    if (this.fechaDevolucionEsperada) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const limite = new Date(this.fechaDevolucionEsperada);
      if (limite < hoy) {
        return 'VENCIDO';
      }
    }
    return 'ACTIVO';
  }

  validar() {
    if (!this.libroTitulo || this.libroTitulo.trim() === '') {
      throw new Error('El título o identificador del libro es obligatorio.');
    }
    if (!this.usuarioNombre || this.usuarioNombre.trim() === '') {
      throw new Error('El nombre del lector es obligatorio.');
    }
    if (!this.fechaDevolucionEsperada) {
      throw new Error('La fecha límite de devolución es obligatoria.');
    }
    return true;
  }
}
