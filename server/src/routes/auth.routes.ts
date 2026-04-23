/**
 * Auth Routes
 *
 * Handles user authentication and registration.
 * - POST /register  — Create a new user (ADMIN only)
 * - POST /login     — Login and receive JWT token
 * - GET  /me        — Get current authenticated user
 * - POST /logout    — Logout current user
 */
import { Router } from 'express';
import { login, register, getCurrentUser, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

// Register requires ADMIN authentication — only admins can create new users
router.post('/register', authenticate, authorize(UserRole.ADMIN), validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;
