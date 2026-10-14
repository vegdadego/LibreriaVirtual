import mongoose from 'mongoose';
import Book from '../models/Book.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, LOOSE_COLLATION } from '../utils/text.js';
import { parseBookMetadata, resolveRelations } from '../services/bookIngestService.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Número de páginas guardadas de un libro. */
const PAGE_COUNT = { $size: { $ifNull: ['$contenido_escaneado', []] } };

/**
 * Toma el primer valor de un parámetro de query (puede venir repetido).
 *
 * @param {unknown} value
 * @returns {string} Texto sin espacios sobrantes (vacío si no hay valor).
 */
const queryText = (value) => String(Array.isArray(value) ? value[0] : (value ?? '')).trim();

/**
 * Convierte un parámetro a entero dentro de un rango.
 *
 * @param {unknown} value
 * @param {number} fallback Valor si falta o no es válido.
 * @param {number} max Tope máximo.
 * @returns {number}
 */
const toBoundedInt = (value, fallback, max) => {
  const number = Number.parseInt(queryText(value), 10);
  return Number.isInteger(number) && number >= 1 ? Math.min(number, max) : fallback;
};

/**
 * Valida un id de MongoDB y lo convierte a ObjectId.
 *
 * @param {string} id
 * @returns {import('mongoose').Types.ObjectId}
 * @throws {AppError} `INVALID_ID`
 */
const toObjectId = (id) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError(400, 'INVALID_ID', 'Identificador de libro inválido.');
  }
  return new mongoose.Types.ObjectId(id);
};

/**
 * Construye el filtro de MongoDB para el catálogo. Todo texto del usuario se
 * escapa antes de usarse en expresiones regulares.
 *
 * @param {object} query `req.query`.
 * @returns {object}
 */
const buildCatalogFilter = (query) => {
  const filter = {};
  const categoria = queryText(query.categoria);
  const saga = queryText(query.saga);
  const autor = queryText(query.autor);
  const busqueda = queryText(query.busqueda);

  if (categoria) filter.categorias = categoria;
  if (saga) filter['saga.nombre_saga'] = new RegExp(escapeRegex(saga), 'i');
  if (autor) filter['autores.nombre'] = new RegExp(escapeRegex(autor), 'i');
  if (busqueda) {
    const pattern = new RegExp(escapeRegex(busqueda), 'i');
    filter.$or = [
      { titulo: pattern },
      { sinopsis: pattern },
      { 'autores.nombre': pattern },
      { empresa_edicion: pattern },
    ];
  }
  return filter;
};

/**
 * GET /api/v1/books — catálogo paginado, sin el texto de las páginas.
 *
 * Query: `categoria`, `saga`, `autor`, `busqueda`, `page` (1), `limit` (20, máx. 100).
 * Cada libro incluye `total_paginas`.
 *
 * @type {import('express').RequestHandler}
 */
export const getAllBooks = asyncHandler(async (req, res) => {
  const filter = buildCatalogFilter(req.query);
  const page = toBoundedInt(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = toBoundedInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);

  const [total, data] = await Promise.all([
    Book.countDocuments(filter).collation(LOOSE_COLLATION),
    Book.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $addFields: { total_paginas: PAGE_COUNT } },
      { $project: { contenido_escaneado: 0 } },
    ]).collation(LOOSE_COLLATION),
  ]);

  res.json({ success: true, total, page, limit, data });
});

/**
 * GET /api/v1/books/categorias — categorías en uso, ordenadas, para los filtros.
 *
 * @type {import('express').RequestHandler}
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Book.distinct('categorias');
  categories.sort((a, b) => a.localeCompare(b, 'es'));
  res.json({ success: true, total: categories.length, data: categories });
});

/**
 * GET /api/v1/books/:id — metadatos del libro y `total_paginas`, sin el texto.
 * El contenido se pide página a página con {@link getBookPage}.
 *
 * @type {import('express').RequestHandler}
 */
export const getBookById = asyncHandler(async (req, res) => {
  const [book] = await Book.aggregate([
    { $match: { _id: toObjectId(req.params.id) } },
    { $addFields: { total_paginas: PAGE_COUNT } },
    { $project: { contenido_escaneado: 0 } },
  ]);
  if (!book) throw new AppError(404, 'BOOK_NOT_FOUND', 'Libro no encontrado');
  res.json({ success: true, data: book });
});

/**
 * GET /api/v1/books/:id/paginas/:numero — texto de una sola página, con los
 * números de la página anterior y siguiente (`null` en los extremos).
 *
 * @type {import('express').RequestHandler}
 */
export const getBookPage = asyncHandler(async (req, res) => {
  const bookId = toObjectId(req.params.id);
  const number = Number(req.params.numero);
  if (!Number.isInteger(number) || number < 1) {
    throw new AppError(400, 'INVALID_PAGE', 'El número de página debe ser un entero mayor o igual a 1.');
  }

  // Solo viaja la página pedida; el resto del texto se queda en la base de datos.
  const [result] = await Book.aggregate([
    { $match: { _id: bookId } },
    {
      $project: {
        titulo: 1,
        total_paginas: PAGE_COUNT,
        contenido: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ['$contenido_escaneado', []] },
                as: 'p',
                cond: { $eq: ['$$p.pagina', number] },
              },
            },
            0,
          ],
        },
      },
    },
  ]);

  if (!result) throw new AppError(404, 'BOOK_NOT_FOUND', 'Libro no encontrado');
  if (!result.contenido) {
    throw new AppError(404, 'PAGE_NOT_FOUND', `El libro no tiene la página ${number}.`, {
      total_paginas: result.total_paginas,
    });
  }

  res.json({
    success: true,
    data: {
      libro_id: String(result._id),
      titulo: result.titulo,
      pagina: number,
      texto: result.contenido.texto,
      total_paginas: result.total_paginas,
      anterior: number > 1 ? number - 1 : null,
      siguiente: number < result.total_paginas ? number + 1 : null,
    },
  });
});

/**
 * POST /api/v1/books — registra un libro solo con metadatos (sin páginas).
 * Para subir un PDF se usa `POST /api/v1/books/upload`.
 *
 * @type {import('express').RequestHandler}
 */
export const createBook = asyncHandler(async (req, res) => {
  const meta = await resolveRelations(parseBookMetadata(req.body));
  const saved = await Book.create(meta);
  const { contenido_escaneado: _pages, ...data } = saved.toObject();
  res.status(201).json({
    success: true,
    message: 'Libro registrado exitosamente',
    data: { ...data, total_paginas: 0 },
  });
});

/**
 * PUT /api/v1/books/:id — edita los metadatos. El texto de las páginas solo
 * cambia al subir un PDF, por eso `contenido_escaneado` se ignora aquí.
 *
 * @type {import('express').RequestHandler}
 */
export const updateBook = asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  const meta = await resolveRelations(parseBookMetadata(req.body, { partial: true }));
  const updated = await Book.findByIdAndUpdate(
    id,
    { $set: meta },
    { new: true, runValidators: true }
  ).select('-contenido_escaneado');
  if (!updated) throw new AppError(404, 'BOOK_NOT_FOUND', 'Libro no encontrado');
  res.json({ success: true, message: 'Libro actualizado exitosamente', data: updated });
});

/**
 * DELETE /api/v1/books/:id — elimina el libro con todas sus páginas.
 *
 * @type {import('express').RequestHandler}
 */
export const deleteBook = asyncHandler(async (req, res) => {
  const deleted = await Book.findByIdAndDelete(toObjectId(req.params.id)).select('titulo');
  if (!deleted) throw new AppError(404, 'BOOK_NOT_FOUND', 'Libro no encontrado');
  res.json({
    success: true,
    message: 'Libro eliminado exitosamente',
    data: { _id: deleted._id, titulo: deleted.titulo },
  });
});
