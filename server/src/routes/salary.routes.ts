import { Router } from 'express';
import { calculateSalary, getSalaryHistory } from '../controllers/salary.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.post('/calculate', authorize(UserRole.ADMIN), auditLog('salary_calculations', AuditAction.CREATE), calculateSalary);
router.get('/history', getSalaryHistory);

export default router;
