import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.js';
import { AppError } from '../utils/AppError.js';

/**
 * Exige un token JWT válido en `Authorization: Bearer <token>` y deja los
 * datos del usuario en `req.user` (`id`, `nombre_usuario`, `tipo_usuario`).
 *
 * @type {import('express').RequestHandler}
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Token no proporcionado.'));
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], getJwtSecret());
    req.user = {
      id: String(decoded.id),
      nombre_usuario: decoded.nombre_usuario,
      tipo_usuario: decoded.tipo_usuario,
    };
    return next();
  } catch {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado.'));
  }
};

/**
 * Crea un middleware que solo deja pasar a usuarios con alguno de los roles
 * indicados. Debe ir después de `authenticate`.
 *
 * @param {...string} roles Valores permitidos de `tipo_usuario`.
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.tipo_usuario)) {
    return next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para realizar esta acción.'));
  }
  return next();
};
