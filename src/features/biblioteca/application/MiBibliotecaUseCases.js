/**
 * Casos de uso de la biblioteca personal. Son delgados porque la lógica vive
 * en el servidor; existen para que la UI no dependa del repositorio concreto.
 */

/** Caso de uso: cargar el estado (guardados y progreso) del usuario. */
export class GetEstadoUseCase {
  /** @param {import('../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.getEstado();
  }
}

/** Caso de uso: guardar o quitar un libro de "ver más tarde". */
export class ToggleGuardadoUseCase {
  /** @param {import('../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} libroId
   * @param {boolean} guardar `true` para guardar, `false` para quitar.
   */
  execute(libroId, guardar) {
    return guardar ? this.repository.guardar(libroId) : this.repository.quitarGuardado(libroId);
  }
}

/** Caso de uso: listar los libros guardados. */
export class ListGuardadosUseCase {
  /** @param {import('../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.listGuardados();
  }
}

/** Caso de uso: listar los libros que se están leyendo ("continuar leyendo"). */
export class ListProgresoUseCase {
  /** @param {import('../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.listProgreso();
  }
}

/** Caso de uso: recordar la página por la que va el usuario. */
export class GuardarProgresoUseCase {
  /** @param {import('../domain/repositories/MiBibliotecaRepository').MiBibliotecaRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} libroId
   * @param {number} pagina Página actual, desde 1.
   */
  execute(libroId, pagina) {
    return this.repository.guardarProgreso(libroId, pagina);
  }
}
