/**
 * Idiomas que se pueden elegir al subir un libro. `codigo` es lo que se guarda
 * en `Book.idioma` (ISO 639-1); `nombre` es lo que ve la persona.
 *
 * @type {ReadonlyArray<{codigo: string, nombre: string}>}
 */
export const IDIOMAS = Object.freeze([
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'Inglés' },
  { codigo: 'pt', nombre: 'Portugués' },
  { codigo: 'fr', nombre: 'Francés' },
  { codigo: 'it', nombre: 'Italiano' },
  { codigo: 'de', nombre: 'Alemán' },
  { codigo: 'ca', nombre: 'Catalán' },
  { codigo: 'la', nombre: 'Latín' },
  { codigo: 'ja', nombre: 'Japonés' },
  { codigo: 'zh', nombre: 'Chino' },
  { codigo: 'ru', nombre: 'Ruso' },
  { codigo: 'ko', nombre: 'Coreano' },
]);

/**
 * Nombre legible de un código de idioma; si no está en la lista devuelve el código en mayúsculas.
 *
 * @param {string} codigo
 * @returns {string}
 */
export function nombreIdioma(codigo) {
  const code = String(codigo ?? '').toLowerCase();
  return IDIOMAS.find((i) => i.codigo === code)?.nombre ?? code.toUpperCase();
}
