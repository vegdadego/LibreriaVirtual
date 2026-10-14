/**
 * Devuelve la clave con la que se firman y verifican los tokens JWT.
 *
 * Se lee en cada uso y no al cargar el módulo: los imports se evalúan antes de
 * que dotenv.config() cargue server/.env, así que una constante de módulo
 * quedaría siempre vacía.
 *
 * @returns {string} Valor de JWT_SECRET.
 * @throws {Error} Si JWT_SECRET no está definida.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definida en server/.env');
  return secret;
};
