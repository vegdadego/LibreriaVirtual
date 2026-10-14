import multer from 'multer';
import { getLimits } from '../config/limits.js';

/**
 * Recibe un único PDF en el campo `pdf` de un formulario multipart.
 *
 * Usa almacenamiento en memoria: el archivo nunca se escribe a disco, así no
 * hay temporales que limpiar. Los errores de multer (tamaño, campo inesperado)
 * los traduce `errorHandler`.
 *
 * @type {import('express').RequestHandler}
 */
export const uploadPdf = (req, res, next) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getLimits().maxPdfBytes, files: 1, fields: 30 },
  }).single('pdf')(req, res, next);
