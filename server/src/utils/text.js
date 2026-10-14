/**
 * Escapa los metacaracteres de una cadena para usarla dentro de un RegExp
 * sin que el usuario pueda inyectar patrones (ni provocar ReDoS).
 *
 * @param {string} value Texto escrito por el usuario.
 * @returns {string} Texto seguro para `new RegExp(...)`.
 */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normaliza texto extraído de un PDF: forma Unicode NFC (acentos compuestos),
 * sin caracteres nulos y sin espacios al final de cada línea. Conserva los
 * saltos de línea y de párrafo.
 *
 * @param {string} value Texto crudo.
 * @returns {string} Texto normalizado.
 */
export const normalizeText = (value) =>
  String(value)
    .replace(/\0/g, '')
    .normalize('NFC')
    .replace(/[ \t]+$/gm, '')
    .replace(/^\n+|\n+$/g, '');

/**
 * Convierte un valor de formulario en una lista de textos. Acepta un arreglo,
 * un JSON de arreglo (`'["a","b"]'`) o una cadena separada por comas.
 *
 * @param {unknown} value Valor recibido (campo repetido, JSON o CSV).
 * @returns {string[]} Lista sin vacíos ni duplicados.
 */
export const parseList = (value) => {
  if (value === undefined || value === null) return [];
  let items = value;
  if (typeof items === 'string') {
    const trimmed = items.trim();
    if (trimmed.startsWith('[')) {
      try {
        items = JSON.parse(trimmed);
      } catch {
        items = trimmed.split(',');
      }
    } else {
      items = trimmed.split(',');
    }
  }
  if (!Array.isArray(items)) items = [items];
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  return [...new Set(clean)];
};

/**
 * Reduce un texto a una forma comparable: sin acentos y en minúsculas.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const foldText = (value) =>
  String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * Colación de MongoDB para comparar textos sin distinguir mayúsculas ni
 * diacríticos. Se usa `en` y no `es` porque en español la ñ es una letra
 * distinta de la n y "nandu" no encontraría a "Ñandú".
 */
export const LOOSE_COLLATION = { locale: 'en', strength: 1 };
