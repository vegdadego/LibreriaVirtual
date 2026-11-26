/** Reglas de cuántos libros se muestran en el inicio y cómo se reparten en páginas y estantes. */

/** Libros por página en la cuadrícula «Todos» y en los resultados de búsqueda. */
export const LIBROS_POR_PAGINA = 50;
/** Libros que muestra como máximo cada estante. */
export const LIBROS_POR_ESTANTE = 30;
/** Máximo de estantes por categoría. */
export const MAX_ESTANTES_POR_CATEGORIA = 6;

/**
 * Cuántas páginas ocupan `total` libros (siempre al menos una).
 *
 * @param {number} total
 * @param {number} porPagina
 * @returns {number}
 */
export function totalDePaginas(total, porPagina) {
  return Math.max(1, Math.ceil(total / porPagina));
}

/**
 * Número de página escrito en la URL; cualquier valor que no sea un entero desde 1 vale 1.
 *
 * @param {string|number|null} valor
 * @returns {number}
 */
export function leerPagina(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero >= 1 ? numero : 1;
}

/**
 * Posiciones (desde 1) del primer y último libro de una página.
 *
 * @param {number} pagina
 * @param {number} porPagina
 * @param {number} total
 * @returns {{desde: number, hasta: number}}
 */
export function rangoDePagina(pagina, porPagina, total) {
  return {
    desde: Math.min((pagina - 1) * porPagina + 1, total),
    hasta: Math.min(pagina * porPagina, total),
  };
}

/**
 * Agrupa los libros por categoría, con las más pobladas primero.
 *
 * @template {{categorias: string[]}} L
 * @param {L[]} libros
 * @param {number} [maxEstantes] Categorías que se devuelven como máximo.
 * @param {number} [maxLibros] Libros por categoría como máximo.
 * @returns {Array<{categoria: string, libros: L[]}>}
 */
export function agruparPorCategoria(libros, maxEstantes = MAX_ESTANTES_POR_CATEGORIA, maxLibros = LIBROS_POR_ESTANTE) {
  const grupos = new Map();
  libros.forEach((libro) => {
    libro.categorias.forEach((categoria) => {
      if (!grupos.has(categoria)) grupos.set(categoria, []);
      grupos.get(categoria).push(libro);
    });
  });
  return [...grupos.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, maxEstantes)
    .map(([categoria, items]) => ({ categoria, libros: items.slice(0, maxLibros) }));
}
