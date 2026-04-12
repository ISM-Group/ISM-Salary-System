import { Router } from 'express';
import {
  createAttendance,
  getAttendance,
  getDailyAttendance,
  getEmployeeAttendanceCalendar,
  updateAttendance,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', getAttendance);
router.get('/daily', getDailyAttendance);
router.get('/employee/:employeeId/calendar', getEmployeeAttendanceCalendar);
router.post('/', authorize(UserRole.ADMIN), auditLog('attendance', AuditAction.CREATE), createAttendance);
router.put('/:id', authorize(UserRole.ADMIN), auditLog('attendance', AuditAction.UPDATE), updateAttendance);

export default router;
