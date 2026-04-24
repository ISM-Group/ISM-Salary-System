"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Daily Salary Releases Routes
 *
 * Manages daily salary payouts for daily-wage employees.
 * - POST /generate      — Generate release records for a date (ADMIN + MANAGER)
 * - GET /               — List releases for a date (ADMIN + MANAGER)
 * - GET /employee/:id   — Get employee's release history (authenticated)
 * - PUT /:id/release    — Mark individual release as RELEASED (ADMIN only)
 * - PUT /release-all    — Bulk release all pending for a date (ADMIN only)
 * - DELETE /:id         — Delete a PENDING release record (ADMIN only)
 */
const express_1 = require("express");
const dailySalaryReleases_controller_1 = require("../controllers/dailySalaryReleases.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Generate daily releases for a date — ADMIN + MANAGER
router.post('/generate', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, validate_middleware_1.validate)(schemas_1.generateDailyReleasesSchema), dailySalaryReleases_controller_1.generateDailyReleases);
// Get daily releases for a date — ADMIN + MANAGER
router.get('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), dailySalaryReleases_controller_1.getDailyReleases);
// Get employee-specific release history — any authenticated user
router.get('/employee/:employeeId', dailySalaryReleases_controller_1.getEmployeeDailyReleases);
// Release individual daily salary — ADMIN only
router.put('/:id/release', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), dailySalaryReleases_controller_1.releaseDailySalary);
// Bulk release all pending daily salaries for a date — ADMIN only
router.put('/release-all', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.releaseAllDailySalariesSchema), dailySalaryReleases_controller_1.releaseAllDailySalaries);
// Delete a PENDING release record — ADMIN only
router.delete('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), dailySalaryReleases_controller_1.deleteDailyRelease);
exports.default = router;
