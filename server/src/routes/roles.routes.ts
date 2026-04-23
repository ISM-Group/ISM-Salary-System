/**
 * Roles Routes
 *
 * Manages employee roles with department association.
 * - GET  /                         — List all roles
 * - GET  /department/:departmentId — Get roles by department
 * - GET  /:id                      — Get role by ID
 * - POST /                         — Create role (ADMIN only)
 * - PUT  /:id                      — Update role (ADMIN only)
 * - DELETE /:id                    — Delete role (ADMIN only)
 */
import { Router } from 'express';
import {
  getRoles,
  getRolesByDepartment,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roles.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { createRoleSchema, updateRoleSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// Read — both ADMIN and MANAGER
router.get('/', getRoles);
router.get('/department/:departmentId', getRolesByDepartment);
router.get('/:id', getRole);

// Write — ADMIN only
router.post('/', authorize(UserRole.ADMIN), validate(createRoleSchema), createRole);
router.put('/:id', authorize(UserRole.ADMIN), validate(updateRoleSchema), updateRole);
router.delete('/:id', authorize(UserRole.ADMIN), deleteRole);

export default router;
