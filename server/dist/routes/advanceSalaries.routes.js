"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const advanceSalaries_controller_1 = require("../controllers/advanceSalaries.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const auditLog_1 = require("../utils/auditLog");
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
router.get('/', advanceSalaries_controller_1.getAdvanceSalaries);
router.get('/employee/:employeeId', advanceSalaries_controller_1.getEmployeeAdvanceSalaries);
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), upload.single('slip_photo'), (0, auditLog_middleware_1.auditLog)('advance_salaries', auditLog_1.AuditAction.CREATE), advanceSalaries_controller_1.createAdvanceSalary);
exports.default = router;
