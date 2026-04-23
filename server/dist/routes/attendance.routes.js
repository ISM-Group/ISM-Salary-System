"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Attendance Routes
 *
 * Manages employee attendance records.
 * - GET  /                                    — List attendance records
 * - GET  /daily                               — Get daily attendance summary
 * - GET  /employee/:employeeId/calendar       — Get employee attendance calendar
 * - POST /                                    — Create attendance record (ADMIN + MANAGER)
 * - PUT  /:id                                 — Update attendance record (ADMIN + MANAGER)
 */
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read endpoints — accessible by both ADMIN and MANAGER
router.get('/', attendance_controller_1.getAttendance);
router.get('/daily', attendance_controller_1.getDailyAttendance);
router.get('/employee/:employeeId/calendar', attendance_controller_1.getEmployeeAttendanceCalendar);
// Create/update — both ADMIN and MANAGER (data entry)
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, auditLog_middleware_1.auditLog)('attendance', auditLog_1.AuditAction.CREATE), attendance_controller_1.createAttendance);
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, auditLog_middleware_1.auditLog)('attendance', auditLog_1.AuditAction.UPDATE), attendance_controller_1.updateAttendance);
exports.default = router;
