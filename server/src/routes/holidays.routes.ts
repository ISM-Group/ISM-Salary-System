import { Router } from 'express';
import {
  createHoliday,
  deleteHoliday,
  getHoliday,
  getHolidays,
  updateHoliday,
} from '../controllers/holidays.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', getHolidays);
router.get('/:id', getHoliday);
router.post('/', authorize(UserRole.ADMIN), auditLog('holidays', AuditAction.CREATE), createHoliday);
router.put('/:id', authorize(UserRole.ADMIN), auditLog('holidays', AuditAction.UPDATE), updateHoliday);
router.delete('/:id', authorize(UserRole.ADMIN), auditLog('holidays', AuditAction.DELETE), deleteHoliday);

export default router;
