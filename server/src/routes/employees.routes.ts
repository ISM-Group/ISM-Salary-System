/**
 * Employee Routes
 *
 * Manages employee records.
 * - GET  /              — List all employees (ADMIN + MANAGER)
 * - GET  /:id           — Get employee by ID (ADMIN + MANAGER)
 * - GET  /:id/profile   — Get employee profile (ADMIN + MANAGER)
 * - POST /              — Create employee (ADMIN + MANAGER)
 * - PUT  /:id           — Update employee (ADMIN only)
 * - DELETE /:id         — Delete employee (ADMIN only)
 */
import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getEmployeePhoto,
  getEmployeeProfile,
  getEmployees,
  updateEmployee,
} from '../controllers/employees.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from '../validation/schemas';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';
import { memoryImageUpload } from '../utils/fileStorage';

const router = Router();

router.use(authenticate);

// Read endpoints — both ADMIN and MANAGER
router.get('/', getEmployees);
router.get('/:id/photo', getEmployeePhoto);
router.get('/:id', getEmployee);
router.get('/:id/profile', getEmployeeProfile);

// Create — both ADMIN and MANAGER with validation
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  memoryImageUpload.single('photo'),
  validate(createEmployeeSchema),
  auditLog('employees', AuditAction.CREATE),
  createEmployee
);

// Update and delete — ADMIN only with validation
router.put(
  '/:id',
  authorize(UserRole.ADMIN),
  memoryImageUpload.single('photo'),
  validate(updateEmployeeSchema),
  auditLog('employees', AuditAction.UPDATE),
  updateEmployee
);
router.delete('/:id', authorize(UserRole.ADMIN), auditLog('employees', AuditAction.DELETE), deleteEmployee);

export default router;
