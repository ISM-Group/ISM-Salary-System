/**
 * Salary History Routes
 *
 * Tracks salary changes for employees over time.
 * - GET  /employee/:employeeId   — Get salary history for an employee
 * - POST /employee/:employeeId   — Create a salary history entry
 */
import { Router } from 'express';
import {
  getSalaryHistoryByEmployee,
  createSalaryHistoryEntry,
} from '../controllers/salaryHistory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSalaryHistorySchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get('/employee/:employeeId', getSalaryHistoryByEmployee);
router.post('/employee/:employeeId', authorize(UserRole.ADMIN), validate(createSalaryHistorySchema), createSalaryHistoryEntry);

export default router;
