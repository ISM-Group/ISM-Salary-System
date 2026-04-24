"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Salary History Routes
 *
 * Tracks salary changes for employees over time.
 * - GET  /employee/:employeeId   — Get salary history for an employee
 * - POST /employee/:employeeId   — Create a salary history entry
 */
const express_1 = require("express");
const salaryHistory_controller_1 = require("../controllers/salaryHistory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/employee/:employeeId', salaryHistory_controller_1.getSalaryHistoryByEmployee);
router.post('/employee/:employeeId', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.createSalaryHistorySchema), salaryHistory_controller_1.createSalaryHistoryEntry);
exports.default = router;
