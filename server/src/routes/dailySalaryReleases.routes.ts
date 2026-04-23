/**
 * Daily Salary Releases Routes
 *
 * Manages daily salary payouts for daily-wage employees.
 * - POST /generate      — Generate release records for a date (ADMIN + MANAGER)
 * - GET /               — List releases for a date (ADMIN + MANAGER)
 * - GET /employee/:id   — Get employee's release history (authenticated)
 * - PUT /:id/release    — Mark individual release as RELEASED (ADMIN only)
 * - PUT /release-all    — Bulk release all pending for a date (ADMIN only)
 * - DELETE /:id         — Delete a PENDING release record (ADMIN only)
 */
import { Router } from 'express';
import {
  generateDailyReleases,
  getDailyReleases,
  getEmployeeDailyReleases,
  releaseDailySalary,
  releaseAllDailySalaries,
  deleteDailyRelease,
} from '../controllers/dailySalaryReleases.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { generateDailyReleasesSchema, releaseAllDailySalariesSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate daily releases for a date — ADMIN + MANAGER
router.post('/generate', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(generateDailyReleasesSchema), generateDailyReleases);

// Get daily releases for a date — ADMIN + MANAGER
router.get('/', authorize(UserRole.ADMIN, UserRole.MANAGER), getDailyReleases);

// Get employee-specific release history — any authenticated user
router.get('/employee/:employeeId', getEmployeeDailyReleases);

// Release individual daily salary — ADMIN only
router.put('/:id/release', authorize(UserRole.ADMIN), releaseDailySalary);

// Bulk release all pending daily salaries for a date — ADMIN only
router.put('/release-all', authorize(UserRole.ADMIN), validate(releaseAllDailySalariesSchema), releaseAllDailySalaries);

// Delete a PENDING release record — ADMIN only
router.delete('/:id', authorize(UserRole.ADMIN), deleteDailyRelease);

export default router;
