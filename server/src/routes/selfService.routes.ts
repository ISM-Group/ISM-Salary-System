/**
 * Self-Service Routes
 *
 * Employee self-service endpoints. Each authenticated user can access
 * only the records mapped to their own employee profile.
 *
 * - GET /profile         — Get own employee profile
 * - GET /salary-history  — Get own salary history
 * - GET /attendance      — Get own attendance records
 * - GET /loans           — Get own loans
 * - GET /payslip         — Get own payslip for a month
 */
import { Router } from 'express';
import {
  getMyProfile,
  getMySalaryHistory,
  getMyAttendance,
  getMyLoans,
  getMyPayslip,
} from '../controllers/selfService.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/profile', getMyProfile);
router.get('/salary-history', getMySalaryHistory);
router.get('/attendance', getMyAttendance);
router.get('/loans', getMyLoans);
router.get('/payslip', getMyPayslip);

export default router;
