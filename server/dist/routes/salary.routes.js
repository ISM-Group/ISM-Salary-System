"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Salary Routes
 *
 * Handles salary calculations and history retrieval.
 * - POST /calculate    — Calculate salary for an employee
 * - GET  /history      — Get salary calculation history
 */
const express_1 = require("express");
const salary_controller_1 = require("../controllers/salary.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/calculate', (0, validate_middleware_1.validate)(schemas_1.calculateSalarySchema), salary_controller_1.calculateSalary);
router.get('/history', salary_controller_1.getSalaryHistory);
exports.default = router;
