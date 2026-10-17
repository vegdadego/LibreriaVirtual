/** Caso de uso: subir un PDF y seguir su procesamiento. */
export class UploadLibroUseCase {
  /** @param {import('../domain/repositories/LibroRepository').LibroRepository} libroRepository */
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  /**
   * Envía el PDF y sus metadatos. El libro solo aparece en el catálogo cuando
   * el estado de la carga es `completado`.
   *
   * @param {{pdf: File, portada?: Blob, titulo: string, metadatos?: Record<string, string>}} datos
   * @returns {Promise<{jobId: string}>}
   */
  start(datos) {
    return this.libroRepository.upload(datos);
  }

  /**
   * @param {string} jobId
   * @returns {ReturnType<import('../domain/repositories/LibroRepository').LibroRepository['getUploadStatus']>}
   */
  status(jobId) {
    return this.libroRepository.getUploadStatus(jobId);
  }
}
