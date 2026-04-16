import { Router } from 'express';
import { createSalaryHistoryEntry, getSalaryHistoryByEmployee } from '../controllers/salaryHistory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/employee/:employeeId', getSalaryHistoryByEmployee);
router.post(
  '/employee/:employeeId',
  authorize(UserRole.ADMIN),
  auditLog('employee_salary_history', AuditAction.CREATE),
  createSalaryHistoryEntry
);

export default router;
