"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Dashboard Routes
 *
 * Provides dashboard statistics and analytics.
 * All endpoints require authentication. Both ADMIN and MANAGER can access.
 */
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication — both ADMIN and MANAGER can view
router.use(auth_middleware_1.authenticate);
router.get('/stats', dashboard_controller_1.getStats);
router.get('/salary-trends', dashboard_controller_1.getSalaryTrends);
router.get('/department-distribution', dashboard_controller_1.getDepartmentDistribution);
router.get('/attendance-stats', dashboard_controller_1.getAttendanceStats);
router.get('/loan-breakdown', dashboard_controller_1.getLoanBreakdown);
router.get('/recent-activity', dashboard_controller_1.getRecentActivity);
exports.default = router;
