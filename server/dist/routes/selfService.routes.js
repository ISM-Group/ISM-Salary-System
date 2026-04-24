"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const selfService_controller_1 = require("../controllers/selfService.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/profile', selfService_controller_1.getMyProfile);
router.get('/salary-history', selfService_controller_1.getMySalaryHistory);
router.get('/attendance', selfService_controller_1.getMyAttendance);
router.get('/loans', selfService_controller_1.getMyLoans);
router.get('/payslip', selfService_controller_1.getMyPayslip);
exports.default = router;
