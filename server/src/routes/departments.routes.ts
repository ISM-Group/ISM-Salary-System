import { Router } from 'express';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departments.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes require admin role
router.use(authorize(UserRole.ADMIN));

router.get('/', getDepartments);
router.get('/:id', getDepartment);
router.post('/', auditLog('departments', AuditAction.CREATE), createDepartment);
router.put('/:id', auditLog('departments', AuditAction.UPDATE), updateDepartment);
router.delete('/:id', auditLog('departments', AuditAction.DELETE), deleteDepartment);

export default router;
