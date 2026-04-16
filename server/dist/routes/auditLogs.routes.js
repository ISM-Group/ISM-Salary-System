"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditLogs_controller_1 = require("../controllers/auditLogs.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN));
router.post('/verify-passkey', auditLogs_controller_1.verifyPasskey);
router.get('/', auditLogs_controller_1.getAuditLogs);
exports.default = router;
