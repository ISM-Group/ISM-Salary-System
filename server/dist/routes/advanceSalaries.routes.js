"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Advance Salaries Routes
 *
 * Manages advance salary requests with approval workflow.
 * Audit logging is handled directly in controllers with actor role attribution.
 * - GET  /                         — List advance salaries (ADMIN + MANAGER)
 * - GET  /employee/:employeeId     — Get employee advance salaries (ADMIN + MANAGER)
 * - POST /                         — Create advance salary (ADMIN + MANAGER)
 * - PUT  /:id/status               — Update advance salary status (ADMIN only)
 */
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const advanceSalaries_controller_1 = require("../controllers/advanceSalaries.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// List and view — accessible by both ADMIN and MANAGER
router.get('/', advanceSalaries_controller_1.getAdvanceSalaries);
router.get('/employee/:employeeId', advanceSalaries_controller_1.getEmployeeAdvanceSalaries);
// Create advance salary — both ADMIN and MANAGER can create (audit logged in controller with role attribution)
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), upload.single('slip_photo'), advanceSalaries_controller_1.createAdvanceSalary);
// Update advance salary status (approve / reject) — ADMIN only (audit logged in controller with role attribution)
router.put('/:id/status', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), advanceSalaries_controller_1.updateAdvanceSalaryStatus);
exports.default = router;
