import { CATEGORIAS } from './categorias';
import { IDIOMAS } from './idiomas';

/** Nombre que ve la persona de cada dato que se puede autodetectar. */
export const ETIQUETAS_CAMPOS = Object.freeze({
  titulo: 'Título',
  autores: 'Autores',
  categorias: 'Categorías',
  sinopsis: 'Sinopsis',
  idioma: 'Idioma',
  empresa_edicion: 'Editorial',
  numero_edicion: 'N.º de edición',
  fecha_publicacion: 'Fecha de publicación',
  saga: 'Saga',
  numero_en_saga: 'N.º en la saga',
});

/** Campos que el formulario muestra dentro de "Más datos". */
export const CAMPOS_MAS_DATOS = Object.freeze(
  new Set(['idioma', 'empresa_edicion', 'numero_edicion', 'fecha_publicacion', 'saga', 'numero_en_saga'])
);

/**
 * Pasa "Apellido, Nombre" a "Nombre Apellido". El formulario separa los autores por
 * comas, así que un nombre con coma se partiría en dos.
 *
 * @param {string} nombre
 * @returns {string}
 */
const sinComa = (nombre) => {
  const [apellido, ...resto] = nombre.split(',');
  return resto.length ? `${resto.join(' ').trim()} ${apellido.trim()}`.trim() : nombre.trim();
};

/**
 * Convierte lo que detectó el servidor en valores del formulario de subida.
 *
 * Solo toma lo que el formulario sabe mostrar (las categorías y el idioma deben
 * estar en sus listas) y respeta los campos que la persona ya editó a mano.
 *
 * @param {Object} datos Respuesta de `POST /books/analyze`.
 * @param {Set<string>} [tocados] Campos que la persona editó; no se tocan.
 * @returns {{valores: Record<string, string|string[]>, detectados: string[], precisionFecha: 'dia'|'mes'|'anio'|null}}
 *   `valores` se mezcla con el estado del formulario y `detectados` son las claves rellenadas.
 */
export function sugerenciasParaFormulario(datos, tocados = new Set()) {
  const valores = {};
  const put = (campo, valor) => {
    if (tocados.has(campo)) return;
    if (valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && !valor.length)) return;
    valores[campo] = valor;
  };

  put('titulo', typeof datos.titulo === 'string' ? datos.titulo.trim() : '');
  put('autores', Array.isArray(datos.autores) ? datos.autores.map(sinComa).filter(Boolean).join(', ') : '');
  put('categorias', (datos.categorias ?? []).filter((categoria) => CATEGORIAS.includes(categoria)));
  put('sinopsis', typeof datos.sinopsis === 'string' ? datos.sinopsis.trim() : '');
  put('idioma', IDIOMAS.some(({ codigo }) => codigo === datos.idioma) ? datos.idioma : '');
  put('empresa_edicion', typeof datos.empresa_edicion === 'string' ? datos.empresa_edicion.trim() : '');
  put('numero_edicion', Number.isInteger(datos.numero_edicion) ? String(datos.numero_edicion) : '');
  put('fecha_publicacion', /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_publicacion ?? '') ? datos.fecha_publicacion : '');
  put('saga', typeof datos.saga === 'string' ? datos.saga.trim() : '');
  if ('saga' in valores) put('numero_en_saga', Number.isInteger(datos.numero_en_saga) ? String(datos.numero_en_saga) : '');

  return {
    valores,
    detectados: Object.keys(valores),
    precisionFecha: 'fecha_publicacion' in valores ? (datos.fecha_precision ?? null) : null,
  };
}
