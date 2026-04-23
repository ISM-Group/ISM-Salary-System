/**
 * Department Routes
 *
 * Manages departments within the organization.
 * - GET  /      — List all departments
 * - GET  /:id   — Get department by ID
 * - POST /      — Create department (ADMIN only)
 * - PUT  /:id   — Update department (ADMIN only)
 * - DELETE /:id — Delete department (ADMIN only)
 */
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
import { validate } from '../middleware/validate.middleware';
import { createDepartmentSchema, updateDepartmentSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// Read — both ADMIN and MANAGER
router.get('/', getDepartments);
router.get('/:id', getDepartment);

// Write — ADMIN only
router.post('/', authorize(UserRole.ADMIN), validate(createDepartmentSchema), createDepartment);
router.put('/:id', authorize(UserRole.ADMIN), validate(updateDepartmentSchema), updateDepartment);
router.delete('/:id', authorize(UserRole.ADMIN), deleteDepartment);

export default router;
