/**
 * Attendance Routes
 *
 * Manages employee attendance records.
 * - GET  /                                  — List attendance records
 * - GET  /daily                             — Get daily attendance for a date
 * - GET  /employee/:employeeId/calendar     — Get employee attendance calendar
 * - POST /                                  — Create/upsert attendance record
 * - PUT  /:id                               — Update attendance record
 */
import { Router } from 'express';
import {
  getAttendance,
  getDailyAttendance,
  createAttendance,
  updateAttendance,
  getEmployeeAttendanceCalendar,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAttendanceSchema, updateAttendanceSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/', getAttendance);
router.get('/daily', getDailyAttendance);
router.get('/employee/:employeeId/calendar', getEmployeeAttendanceCalendar);
router.post('/', validate(createAttendanceSchema), createAttendance);
router.put('/:id', validate(updateAttendanceSchema), updateAttendance);

export default router;
