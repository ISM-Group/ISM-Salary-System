"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Export Routes
 *
 * Provides CSV and HTML (printable/PDF) exports for payroll, attendance, and loan data.
 * Also includes payslip generation per employee per period.
 *
 * - GET /payroll          — Export payroll data (CSV or HTML)
 * - GET /attendance       — Export attendance data (CSV or HTML)
 * - GET /loans            — Export loan data (CSV or HTML)
 * - GET /payslip/:employeeId — Generate printable payslip for an employee
 */
const express_1 = require("express");
const exports_controller_1 = require("../controllers/exports.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Report exports — accessible to ADMIN and MANAGER
router.get('/payroll', exports_controller_1.exportPayroll);
router.get('/attendance', exports_controller_1.exportAttendance);
router.get('/loans', exports_controller_1.exportLoans);
// Payslip generation — accessible to ADMIN and MANAGER
router.get('/payslip/:employeeId', exports_controller_1.generatePayslip);
exports.default = router;
