import { Router } from 'express';
import multer from 'multer';
import {
  getAdvanceSalaries,
  getEmployeeAdvanceSalaries,
  createAdvanceSalary,
} from '../controllers/advanceSalaries.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// All routes require authentication
router.use(authenticate);

router.get('/', getAdvanceSalaries);
router.get('/employee/:employeeId', getEmployeeAdvanceSalaries);
router.post(
  '/',
  authorize(UserRole.ADMIN),
  upload.single('slip_photo'),
  auditLog('advance_salaries', AuditAction.CREATE),
  createAdvanceSalary
);

export default router;

