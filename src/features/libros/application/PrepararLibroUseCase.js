/**
 * Caso de uso: preparar un PDF para subirlo. Se envía una sola vez; el servidor propone los
 * datos del libro, dibuja su portada y lee su texto mientras la persona revisa el formulario.
 */
export class PrepararLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * @param {File} pdf Archivo elegido para subir.
   * @param {{onProgress?: Function, signal?: AbortSignal}} [options] Avance de la subida y cancelación.
   * @returns {ReturnType<import('../domain/repositories/LibroRepository').LibroRepository['stage']>}
   */
  preparar(pdf, options) {
    return this.libroRepository.stage(pdf, options);
  }

  /**
   * @param {string} stageId
   * @returns {ReturnType<import('../domain/repositories/LibroRepository').LibroRepository['getStageStatus']>}
   */
  estado(stageId) {
    return this.libroRepository.getStageStatus(stageId);
  }

  /**
   * @param {string} stageId
   * @returns {Promise<void>}
   */
  descartar(stageId) {
    return this.libroRepository.discardStage(stageId);
  }
}
