"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Department Routes
 *
 * Manages departments.
 * - GET  /       — List all departments (ADMIN + MANAGER)
 * - GET  /:id    — Get department by ID (ADMIN + MANAGER)
 * - POST /       — Create department (ADMIN only)
 * - PUT  /:id    — Update department (ADMIN only)
 * - DELETE /:id  — Delete department (ADMIN only)
 */
const express_1 = require("express");
const departments_controller_1 = require("../controllers/departments.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Read endpoints — both ADMIN and MANAGER
router.get('/', departments_controller_1.getDepartments);
router.get('/:id', departments_controller_1.getDepartment);
// Mutation endpoints — ADMIN only
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.CREATE), departments_controller_1.createDepartment);
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.UPDATE), departments_controller_1.updateDepartment);
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.DELETE), departments_controller_1.deleteDepartment);
exports.default = router;
