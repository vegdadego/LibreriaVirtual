import { Router } from 'express';
import {
  getAllBooks,
  getBookById,
  getBookPage,
  getCategories,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/bookController.js';
import { getUploadStatus, uploadBook } from '../controllers/bookUploadController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/uploadPdf.js';

const router = Router();
const canWrite = [authenticate, requireRole('uploader', 'admin')];

// Las rutas fijas van antes de '/:id' para que no se interpreten como un id.
router.post('/upload', ...canWrite, uploadPdf, uploadBook);
router.get('/uploads/:jobId', ...canWrite, getUploadStatus);
router.get('/categorias', getCategories);

router.route('/')
  .get(getAllBooks)
  .post(...canWrite, createBook);

router.get('/:id/paginas/:numero', getBookPage);

router.route('/:id')
  .get(getBookById)
  .put(...canWrite, updateBook)
  .delete(...canWrite, deleteBook);

export default router;
