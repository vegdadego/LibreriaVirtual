/**
 * Error de aplicación con código HTTP y un `code` estable que el frontend
 * puede usar para decidir qué mensaje mostrar.
 */
export class AppError extends Error {
  /**
   * @param {number} status Código HTTP de la respuesta.
   * @param {string} code Identificador estable del error (ej. `CORRUPT_PDF`).
   * @param {string} message Mensaje legible para el usuario.
   * @param {object} [extra] Datos adicionales que se incluyen en la respuesta.
   */
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export default AppError;
