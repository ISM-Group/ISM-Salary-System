import { Router } from 'express';
import {
  getAttendanceStats,
  getDepartmentDistribution,
  getLoanBreakdown,
  getRecentActivity,
  getSalaryTrends,
  getStats,
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
