"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', attendance_controller_1.getAttendance);
router.get('/daily', attendance_controller_1.getDailyAttendance);
router.get('/employee/:employeeId/calendar', attendance_controller_1.getEmployeeAttendanceCalendar);
router.post('/', (0, validate_middleware_1.validate)(schemas_1.createAttendanceSchema), attendance_controller_1.createAttendance);
router.put('/:id', (0, validate_middleware_1.validate)(schemas_1.updateAttendanceSchema), attendance_controller_1.updateAttendance);
exports.default = router;
