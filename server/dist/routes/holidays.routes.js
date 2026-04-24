"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Holiday Routes
 *
 * Manages holidays with support for GLOBAL and PER_EMPLOYEE scoping.
 * Audit logging is handled directly in controllers with actor role attribution.
 * - GET /                         — List all holidays (with employee assignments)
 * - GET /:id                      — Get single holiday details
 * - GET /employee/:employeeId     — Get holidays applicable to specific employee
 * - POST /                        — Create holiday (ADMIN)
 * - PUT /:id                      — Update holiday (ADMIN)
 * - PUT /:id/employees            — Update employee assignments for PER_EMPLOYEE holiday (ADMIN)
 * - DELETE /:id                   — Delete holiday (ADMIN)
 */
const express_1 = require("express");
const holidays_controller_1 = require("../controllers/holidays.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// List all holidays (authenticated users)
router.get('/', holidays_controller_1.getHolidays);
// Get holidays applicable to a specific employee
router.get('/employee/:employeeId', holidays_controller_1.getEmployeeHolidays);
// Get single holiday
router.get('/:id', holidays_controller_1.getHoliday);
// Create holiday (ADMIN only, audit logged in controller with role attribution)
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.createHolidaySchema), holidays_controller_1.createHoliday);
// Update holiday (ADMIN only, audit logged in controller with role attribution)
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateHolidaySchema), holidays_controller_1.updateHoliday);
// Update employee assignments for a holiday (ADMIN only, audit logged in controller with role attribution)
router.put('/:id/employees', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateHolidayEmployeesSchema), holidays_controller_1.updateHolidayEmployees);
// Delete holiday (ADMIN only, audit logged in controller with role attribution)
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), holidays_controller_1.deleteHoliday);
exports.default = router;
