import { createHash } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { extractPdfPages, looksLikePdf } from '../services/pdfTextExtractor.js';
import {
  findDuplicateBook,
  parseBookMetadata,
  saveBookWithPages,
  titleKeyFor,
} from '../services/bookIngestService.js';
import { enqueueUpload, getJob, toPublicJob } from '../services/uploadJobs.js';

/** Tipos MIME aceptados; algunos clientes envían los PDF como octet-stream. */
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf', 'application/octet-stream']);

/**
 * POST /api/v1/books/upload — recibe un PDF y sus metadatos y lo procesa en segundo plano.
 *
 * Valida de inmediato el archivo (presente, tipo, cabecera `%PDF-`), los
 * metadatos y que el libro no exista ya; si todo está bien encola la carga y
 * responde 202 con el `jobId` para consultar el avance. Un reintento con el
 * mismo archivo devuelve el mismo `jobId` (200).
 *
 * @type {import('express').RequestHandler}
 */
export const uploadBook = asyncHandler(async (req, res) => {
  const { file } = req;
  if (!file) {
    throw new AppError(400, 'FILE_REQUIRED', 'Adjunta un archivo PDF en el campo "pdf".');
  }
  if (!ACCEPTED_MIME_TYPES.has(file.mimetype) || !looksLikePdf(file.buffer)) {
    throw new AppError(415, 'INVALID_FILE', 'El archivo no es un PDF válido.');
  }

  const meta = parseBookMetadata(req.body);
  const duplicate = await findDuplicateBook(meta);
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BOOK', 'Ya existe un libro con ese título, edición e idioma.', {
      libro_id: String(duplicate._id),
    });
  }

  const hash = createHash('sha256').update(file.buffer).digest('hex');
  // El buffer pasa al trabajo, que lo suelta al terminar; la petición no lo retiene.
  const payload = { buffer: file.buffer };
  file.buffer = null;

  const { job, reused } = enqueueUpload({
    owner: req.user.id,
    hash,
    titleKey: titleKeyFor(meta),
    payload,
    task: async ({ payload: data, onProgress }) => {
      const pages = await extractPdfPages(data.buffer, { onProgress });
      const book = await saveBookWithPages(meta, pages);
      return { libro_id: String(book._id) };
    },
  });

  res
    .status(reused ? 200 : 202)
    .location(`/api/v1/books/uploads/${job.id}`)
    .json({ success: true, data: toPublicJob(job) });
});

/**
 * GET /api/v1/books/uploads/:jobId — estado de una carga (pendiente,
 * procesando, completado o error). Solo la consulta quien la inició o un admin.
 *
 * @type {import('express').RequestHandler}
 */
export const getUploadStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);
  const allowed = job && (job.owner === req.user.id || req.user.tipo_usuario === 'admin');
  if (!allowed) {
    throw new AppError(404, 'JOB_NOT_FOUND', 'La carga no existe o ya expiró.');
  }
  res.json({ success: true, data: toPublicJob(job) });
});
