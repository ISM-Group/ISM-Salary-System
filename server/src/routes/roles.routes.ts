import { Router } from 'express';
import {
  createRole,
  deleteRole,
  getRole,
  getRoles,
  getRolesByDepartment,
  updateRole,
} from '../controllers/roles.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', getRoles);
router.get('/department/:departmentId', getRolesByDepartment);
router.get('/:id', getRole);
router.post('/', authorize(UserRole.ADMIN), auditLog('roles', AuditAction.CREATE), createRole);
router.put('/:id', authorize(UserRole.ADMIN), auditLog('roles', AuditAction.UPDATE), updateRole);
router.delete('/:id', authorize(UserRole.ADMIN), auditLog('roles', AuditAction.DELETE), deleteRole);

export default router;
