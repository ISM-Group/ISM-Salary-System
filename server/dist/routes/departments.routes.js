"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
// All routes require admin role
router.use((0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN));
router.get('/', departments_controller_1.getDepartments);
router.get('/:id', departments_controller_1.getDepartment);
router.post('/', (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.CREATE), departments_controller_1.createDepartment);
router.put('/:id', (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.UPDATE), departments_controller_1.updateDepartment);
router.delete('/:id', (0, auditLog_middleware_1.auditLog)('departments', auditLog_1.AuditAction.DELETE), departments_controller_1.deleteDepartment);
exports.default = router;
