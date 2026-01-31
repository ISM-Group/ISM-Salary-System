import { Router } from 'express';
import { login, register, getCurrentUser, logout } from '../controllers/auth.controller.sql';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;

