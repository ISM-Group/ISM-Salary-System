"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Employee Routes
 *
 * Manages employee records.
 * - GET  /              — List all employees (ADMIN + MANAGER)
 * - GET  /:id           — Get employee by ID (ADMIN + MANAGER)
 * - GET  /:id/profile   — Get employee profile (ADMIN + MANAGER)
 * - POST /              — Create employee (ADMIN + MANAGER)
 * - PUT  /:id           — Update employee (ADMIN only)
 * - DELETE /:id         — Delete employee (ADMIN only)
 */
const express_1 = require("express");
const employees_controller_1 = require("../controllers/employees.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read endpoints — both ADMIN and MANAGER
router.get('/', employees_controller_1.getEmployees);
router.get('/:id', employees_controller_1.getEmployee);
router.get('/:id/profile', employees_controller_1.getEmployeeProfile);
// Create — both ADMIN and MANAGER with validation
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, validate_middleware_1.validate)(schemas_1.createEmployeeSchema), (0, auditLog_middleware_1.auditLog)('employees', auditLog_1.AuditAction.CREATE), employees_controller_1.createEmployee);
// Update and delete — ADMIN only with validation
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateEmployeeSchema), (0, auditLog_middleware_1.auditLog)('employees', auditLog_1.AuditAction.UPDATE), employees_controller_1.updateEmployee);
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, auditLog_middleware_1.auditLog)('employees', auditLog_1.AuditAction.DELETE), employees_controller_1.deleteEmployee);
exports.default = router;
