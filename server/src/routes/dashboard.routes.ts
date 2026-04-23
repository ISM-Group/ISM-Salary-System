/**
 * Dashboard Routes
 *
 * Provides aggregated statistics and analytics data.
 * - GET /stats                      — Get overview statistics
 * - GET /salary-trends              — Get salary trends over months
 * - GET /department-distribution    — Get employee count by department
 * - GET /attendance-stats           — Get attendance statistics
 * - GET /loan-breakdown             — Get loan breakdown by status
 * - GET /recent-activity            — Get recent audit log activity
 */
import { Router } from 'express';
import {
  getStats,
  getSalaryTrends,
  getDepartmentDistribution,
  getAttendanceStats,
  getLoanBreakdown,
  getRecentActivity,
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', getStats);
router.get('/salary-trends', getSalaryTrends);
router.get('/department-distribution', getDepartmentDistribution);
router.get('/attendance-stats', getAttendanceStats);
router.get('/loan-breakdown', getLoanBreakdown);
router.get('/recent-activity', getRecentActivity);

export default router;
