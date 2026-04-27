import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getUsers, resetPassword, setUserStatus } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);

router.get('/', getUsers);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/status', setUserStatus);

export default router;
