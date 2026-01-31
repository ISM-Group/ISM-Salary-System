import { Router } from 'express';
import { verifyPasskey, getAuditLogs } from '../controllers/auditLogs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.post('/verify-passkey', verifyPasskey);
router.get('/', getAuditLogs);

export default router;

