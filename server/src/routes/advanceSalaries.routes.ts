/**
 * Advance Salaries Routes
 *
 * Manages advance salary requests with approval workflow.
 * Audit logging is handled directly in controllers with actor role attribution.
 * - GET  /                         — List advance salaries (ADMIN + MANAGER)
 * - GET  /employee/:employeeId     — Get employee advance salaries (ADMIN + MANAGER)
 * - POST /                         — Create advance salary (ADMIN + MANAGER)
 * - PUT  /:id/status               — Update advance salary status (ADMIN only)
 */
import { Router } from 'express';
import multer from 'multer';
import { diskStorage } from '../utils/fileStorage';
import {
  getAdvanceSalaries,
  getEmployeeAdvanceSalaries,
  createAdvanceSalary,
  updateAdvanceSalaryStatus,
} from '../controllers/advanceSalaries.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateAdvanceSalaryStatusSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

// Configure multer for disk storage – files are persisted to uploads/ directory
const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// All routes require authentication
router.use(authenticate);

// List and view — accessible by both ADMIN and MANAGER
router.get('/', getAdvanceSalaries);
router.get('/employee/:employeeId', getEmployeeAdvanceSalaries);

// Create advance salary — both ADMIN and MANAGER can create (audit logged in controller with role attribution)
// Note: multipart/form-data doesn't go through JSON body validation, so validation is done in the controller
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  upload.single('slip_photo'),
  createAdvanceSalary
);

// Update advance salary status (approve / reject) — ADMIN only (audit logged in controller with role attribution)
router.put('/:id/status', authorize(UserRole.ADMIN), validate(updateAdvanceSalaryStatusSchema), updateAdvanceSalaryStatus);

export default router;
