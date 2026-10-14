import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  logout,
} from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

export default router;
