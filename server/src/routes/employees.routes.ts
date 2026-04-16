import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getEmployeeProfile,
  getEmployees,
  updateEmployee,
} from '../controllers/employees.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.get('/:id/profile', getEmployeeProfile);
router.post('/', authorize(UserRole.ADMIN), auditLog('employees', AuditAction.CREATE), createEmployee);
router.put('/:id', authorize(UserRole.ADMIN), auditLog('employees', AuditAction.UPDATE), updateEmployee);
router.delete('/:id', authorize(UserRole.ADMIN), auditLog('employees', AuditAction.DELETE), deleteEmployee);

export default router;
