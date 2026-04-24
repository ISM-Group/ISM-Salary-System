"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Department Routes
 *
 * Manages departments within the organization.
 * - GET  /      — List all departments
 * - GET  /:id   — Get department by ID
 * - POST /      — Create department (ADMIN only)
 * - PUT  /:id   — Update department (ADMIN only)
 * - DELETE /:id — Delete department (ADMIN only)
 */
const express_1 = require("express");
const departments_controller_1 = require("../controllers/departments.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read — both ADMIN and MANAGER
router.get('/', departments_controller_1.getDepartments);
router.get('/:id', departments_controller_1.getDepartment);
// Write — ADMIN only
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.createDepartmentSchema), departments_controller_1.createDepartment);
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateDepartmentSchema), departments_controller_1.updateDepartment);
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), departments_controller_1.deleteDepartment);
exports.default = router;
