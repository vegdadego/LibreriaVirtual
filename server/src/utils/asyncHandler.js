/**
 * Envuelve un controlador async de Express 4 para que sus errores lleguen a
 * `errorHandler` en lugar de quedar como promesas rechazadas sin atender.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
