import multer from 'multer';
import { AppError } from '../utils/AppError.js';

/**
 * Convierte cualquier error en la respuesta uniforme
 * `{ success: false, code, message }`. Los errores no previstos devuelven 500
 * sin exponer detalles internos.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ success: false, code: err.code, message: err.message, ...err.extra });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: 'El PDF supera el tamaño máximo permitido.',
      });
    }
    const message =
      err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Envía un solo archivo en el campo "pdf".'
        : 'Solicitud de carga inválida.';
    return res.status(400).json({ success: false, code: 'INVALID_UPLOAD', message });
  }

  if (err?.name === 'ValidationError') {
    return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: err.message });
  }

  if (err?.name === 'CastError') {
    return res
      .status(400)
      .json({ success: false, code: 'INVALID_ID', message: 'Identificador inválido.' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'JSON inválido.' });
  }

  console.error('Error no controlado:', err);
  return res
    .status(500)
    .json({ success: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' });
};
