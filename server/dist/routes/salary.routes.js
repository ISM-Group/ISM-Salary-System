"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Salary Routes
 *
 * Manages salary calculations.
 * - POST /calculate   — Calculate salary for an employee (ADMIN + MANAGER)
 * - GET  /history     — Get salary calculation history (ADMIN + MANAGER)
 */
const express_1 = require("express");
const salary_controller_1 = require("../controllers/salary.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Calculate salary — both ADMIN and MANAGER
router.post('/calculate', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, auditLog_middleware_1.auditLog)('salary_calculations', auditLog_1.AuditAction.CREATE), salary_controller_1.calculateSalary);
// View salary history — both ADMIN and MANAGER
router.get('/history', salary_controller_1.getSalaryHistory);
exports.default = router;
