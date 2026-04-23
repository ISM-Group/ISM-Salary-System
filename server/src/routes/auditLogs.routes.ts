/**
 * Audit Logs Routes
 *
 * Provides access to the system audit trail.
 * - POST /verify-passkey   — Verify passkey before accessing audit logs
 * - GET  /                 — List audit log entries (ADMIN only)
 */
import { Router } from 'express';
import { verifyPasskey, getAuditLogs } from '../controllers/auditLogs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { verifyPasskeySchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post('/verify-passkey', authorize(UserRole.ADMIN), validate(verifyPasskeySchema), verifyPasskey);
router.get('/', authorize(UserRole.ADMIN), getAuditLogs);

export default router;
