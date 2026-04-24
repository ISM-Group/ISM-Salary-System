"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Roles Routes
 *
 * Manages employee roles with department association.
 * - GET  /                         — List all roles
 * - GET  /department/:departmentId — Get roles by department
 * - GET  /:id                      — Get role by ID
 * - POST /                         — Create role (ADMIN only)
 * - PUT  /:id                      — Update role (ADMIN only)
 * - DELETE /:id                    — Delete role (ADMIN only)
 */
const express_1 = require("express");
const roles_controller_1 = require("../controllers/roles.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read — both ADMIN and MANAGER
router.get('/', roles_controller_1.getRoles);
router.get('/department/:departmentId', roles_controller_1.getRolesByDepartment);
router.get('/:id', roles_controller_1.getRole);
// Write — ADMIN only
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.createRoleSchema), roles_controller_1.createRole);
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateRoleSchema), roles_controller_1.updateRole);
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), roles_controller_1.deleteRole);
exports.default = router;
