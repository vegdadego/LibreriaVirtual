import Book from '../models/Book.js';
import Author from '../models/Author.js';
import Saga from '../models/Saga.js';
import { AppError } from '../utils/AppError.js';
import { foldText, LOOSE_COLLATION, parseList } from '../utils/text.js';


const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Convierte un valor a número entero >= 1 o lanza error de validación.
 *
 * @param {unknown} value
 * @param {string} field Nombre del campo, para el mensaje.
 * @returns {number}
 */
const toPositiveInt = (value, field) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new AppError(400, 'INVALID_METADATA', `"${field}" debe ser un entero mayor o igual a 1.`);
  }
  return number;
};

/**
 * Valida y normaliza los metadatos de un libro recibidos del formulario o de
 * un JSON. Solo se aceptan los campos conocidos (lista blanca), nunca el
 * contenido de las páginas.
 *
 * @param {object} body Cuerpo de la petición (`req.body`).
 * @param {object} [options]
 * @param {boolean} [options.partial=false] Si es `true` (edición) solo se
 *   incluyen los campos presentes y el título no es obligatorio.
 * @returns {object} Metadatos limpios; `autores` y `saga` aún sin resolver (ver {@link resolveRelations}).
 * @throws {AppError} `INVALID_METADATA` si falta el título o algún valor no es válido.
 */
export const parseBookMetadata = (body = {}, { partial = false } = {}) => {
  const has = (key) => body[key] !== undefined;
  const meta = {};

  if (has('titulo') || !partial) {
    if (isBlank(body.titulo)) {
      throw new AppError(400, 'INVALID_METADATA', 'El título del libro es obligatorio.');
    }
    meta.titulo = String(body.titulo).trim();
  }
  if (has('sinopsis')) meta.sinopsis = String(body.sinopsis).trim();
  if (has('idioma') && !isBlank(body.idioma)) meta.idioma = String(body.idioma).trim();
  if (has('empresa_edicion')) meta.empresa_edicion = String(body.empresa_edicion).trim();
  if (has('numero_edicion') && !isBlank(body.numero_edicion)) {
    meta.numero_edicion = toPositiveInt(body.numero_edicion, 'numero_edicion');
  }
  if (has('fecha_publicacion') && !isBlank(body.fecha_publicacion)) {
    const date = new Date(body.fecha_publicacion);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(400, 'INVALID_METADATA', '"fecha_publicacion" no es una fecha válida.');
    }
    meta.fecha_publicacion = date;
  }
  if (has('categorias')) meta.categorias = parseList(body.categorias);

  if (has('autores')) {
    meta.autores = parseAuthors(body.autores).map((nombre) => ({ nombre }));
  }

  if (has('saga')) {
    const raw = typeof body.saga === 'object' && body.saga !== null ? body.saga : null;
    const name = raw ? raw.nombre_saga : body.saga;
    const number = raw ? raw.numero_en_saga : body.numero_en_saga;
    meta.saga = isBlank(name)
      ? null
      : {
          nombre_saga: String(name).trim(),
          numero_en_saga: isBlank(number) ? 1 : toPositiveInt(number, 'numero_en_saga'),
        };
  }
  return meta;
};

/**
 * Extrae nombres de autores desde una lista de textos u objetos `{ nombre }`.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
const parseAuthors = (value) => {
  if (Array.isArray(value) && value.some((item) => item && typeof item === 'object')) {
    return parseList(value.map((item) => (typeof item === 'object' ? item?.nombre : item)));
  }
  return parseList(value);
};

/**
 * Clave para detectar el mismo libro: título, edición e idioma, sin
 * distinguir mayúsculas ni acentos.
 *
 * @param {{titulo: string, numero_edicion?: number, idioma?: string}} meta
 * @returns {string}
 */
export const titleKeyFor = (meta) =>
  [meta.titulo, meta.numero_edicion ?? 1, meta.idioma ?? 'es'].map(foldText).join('|');

/**
 * Completa `autores` y `saga` con el id de los documentos ya existentes en
 * `Author`/`Saga` (búsqueda por nombre). Si no existen, queda solo el nombre:
 * este servicio no crea autores ni sagas.
 *
 * @param {object} meta Metadatos de {@link parseBookMetadata}.
 * @returns {Promise<object>} Copia de `meta` con los ids resueltos.
 */
export const resolveRelations = async (meta) => {
  const resolved = { ...meta };

  if (meta.autores?.length) {
    const found = await Author.find({ nombre: { $in: meta.autores.map((a) => a.nombre) } })
      .collation(LOOSE_COLLATION)
      .select('nombre')
      .lean();
    const byName = new Map(found.map((author) => [foldText(author.nombre), author]));
    resolved.autores = meta.autores.map(({ nombre }) => {
      const author = byName.get(foldText(nombre));
      return author ? { id_autor: author._id, nombre: author.nombre } : { nombre };
    });
  }

  if (meta.saga) {
    const saga = await Saga.findOne({ nombre: meta.saga.nombre_saga })
      .collation(LOOSE_COLLATION)
      .select('nombre')
      .lean();
    resolved.saga = saga
      ? { ...meta.saga, id_saga: saga._id, nombre_saga: saga.nombre }
      : meta.saga;
  }
  return resolved;
};

/**
 * Busca un libro ya registrado con el mismo título, edición e idioma.
 *
 * @param {{titulo: string, numero_edicion?: number, idioma?: string}} meta
 * @returns {Promise<{_id: import('mongoose').Types.ObjectId}|null>}
 */
export const findDuplicateBook = (meta) =>
  Book.findOne({
    titulo: meta.titulo,
    numero_edicion: meta.numero_edicion ?? 1,
    idioma: meta.idioma ?? 'es',
  })
    .collation(LOOSE_COLLATION)
    .select('_id')
    .lean();

/**
 * Registra un libro con todas sus páginas en una sola inserción.
 *
 * Al ser un único documento, la operación es atómica: si algo falla no queda
 * un libro a medias. Se llama solo cuando la extracción terminó con éxito.
 *
 * @param {object} meta Metadatos ya validados (ver {@link parseBookMetadata}).
 * @param {Array<{pagina: number, texto: string}>} pages Texto por página, en orden.
 * @returns {Promise<import('mongoose').Document>} El libro guardado.
 * @throws {AppError} `DUPLICATE_BOOK` (con `libro_id` del existente) si ya está registrado.
 */
export const saveBookWithPages = async (meta, pages) => {
  const duplicate = await findDuplicateBook(meta);
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BOOK', 'Ya existe un libro con ese título, edición e idioma.', {
      libro_id: String(duplicate._id),
    });
  }
  const resolved = await resolveRelations(meta);
  return Book.create({ ...resolved, contenido_escaneado: pages });
};
