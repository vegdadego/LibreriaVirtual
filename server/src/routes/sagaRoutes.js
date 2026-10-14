import { Router } from 'express';
import {
  getAllSagas,
  getSagaById,
  createSaga,
  updateSaga,
  deleteSaga,
} from '../controllers/sagaController.js';

const router = Router();

router.route('/')
  .get(getAllSagas)
  .post(createSaga);

router.route('/:id')
  .get(getSagaById)
  .put(updateSaga)
  .delete(deleteSaga);

export default router;
