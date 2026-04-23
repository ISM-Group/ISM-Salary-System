/**
 * Holiday Routes
 *
 * Manages holidays with support for GLOBAL and PER_EMPLOYEE scoping.
 * Audit logging is handled directly in controllers with actor role attribution.
 * - GET /                         — List all holidays (with employee assignments)
 * - GET /:id                      — Get single holiday details
 * - GET /employee/:employeeId     — Get holidays applicable to specific employee
 * - POST /                        — Create holiday (ADMIN)
 * - PUT /:id                      — Update holiday (ADMIN)
 * - PUT /:id/employees            — Update employee assignments for PER_EMPLOYEE holiday (ADMIN)
 * - DELETE /:id                   — Delete holiday (ADMIN)
 */
import { Router } from 'express';
import {
  createHoliday,
  deleteHoliday,
  getHoliday,
  getHolidays,
  updateHoliday,
  updateHolidayEmployees,
  getEmployeeHolidays,
} from '../controllers/holidays.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createHolidaySchema,
  updateHolidaySchema,
  updateHolidayEmployeesSchema,
} from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// List all holidays (authenticated users)
router.get('/', getHolidays);

// Get holidays applicable to a specific employee
router.get('/employee/:employeeId', getEmployeeHolidays);

// Get single holiday
router.get('/:id', getHoliday);

// Create holiday (ADMIN only, audit logged in controller with role attribution)
router.post('/', authorize(UserRole.ADMIN), validate(createHolidaySchema), createHoliday);

// Update holiday (ADMIN only, audit logged in controller with role attribution)
router.put('/:id', authorize(UserRole.ADMIN), validate(updateHolidaySchema), updateHoliday);

// Update employee assignments for a holiday (ADMIN only, audit logged in controller with role attribution)
router.put('/:id/employees', authorize(UserRole.ADMIN), validate(updateHolidayEmployeesSchema), updateHolidayEmployees);

// Delete holiday (ADMIN only, audit logged in controller with role attribution)
router.delete('/:id', authorize(UserRole.ADMIN), deleteHoliday);

export default router;
