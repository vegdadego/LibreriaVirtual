/**
 * Entidad de Dominio: DashboardMetrics
 */

export class DashboardMetrics {
  constructor({
    totalLibros = 0,
    prestamosActivos = 0,
    prestamosVencidos = 0,
    totalUsuarios = 0,
    ejemplaresDisponibles = 0
  } = {}) {
    this.totalLibros = Number(totalLibros);
    this.prestamosActivos = Number(prestamosActivos);
    this.prestamosVencidos = Number(prestamosVencidos);
    this.totalUsuarios = Number(totalUsuarios);
    this.ejemplaresDisponibles = Number(ejemplaresDisponibles);
  }

  porcentajeDisponibilidad() {
    if (this.totalLibros === 0) return 0;
    return Math.round((this.ejemplaresDisponibles / this.totalLibros) * 100);
  }
}
