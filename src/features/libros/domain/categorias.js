/**
 * Categorías generales que se pueden elegir al subir un libro. Se guardan tal cual
 * en `Book.categorias`, así que todos los libros nuevos comparten los mismos nombres
 * y los estantes por categoría del inicio no se fragmentan.
 *
 * @type {ReadonlyArray<string>}
 */
export const CATEGORIAS = Object.freeze([
  'Terror',
  'Fantasía',
  'Ciencia ficción',
  'Misterio',
  'Suspenso',
  'Romance',
  'Aventura',
  'Drama',
  'Novela histórica',
  'Clásicos',
  'Humor',
  'Poesía',
  'Biografía',
  'Historia',
  'Ciencia',
  'Filosofía',
  'Psicología',
  'Autoayuda',
  'Educación',
  'Infantil',
  'Juvenil',
  'Cómic y manga',
]);
