/** Caso de uso: detectar automáticamente los datos de un libro a partir de su PDF. */
export class AnalizarLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {File} pdf Archivo elegido para subir.
   * @returns {ReturnType<import('../domain/repositories/LibroRepository').LibroRepository['analyze']>}
   */
  execute(pdf) {
    return this.libroRepository.analyze(pdf);
  }
}
