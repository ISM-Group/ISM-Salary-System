"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Audit Logs Routes
 *
 * Provides access to the system audit trail.
 * - POST /verify-passkey   — Verify passkey before accessing audit logs
 * - GET  /                 — List audit log entries (ADMIN only)
 */
const express_1 = require("express");
const auditLogs_controller_1 = require("../controllers/auditLogs.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/verify-passkey', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.verifyPasskeySchema), auditLogs_controller_1.verifyPasskey);
router.get('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), auditLogs_controller_1.getAuditLogs);
exports.default = router;
