"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Loans Routes
 *
 * Manages employee loans with MONTHLY and DAILY repayment modes.
 * Audit logging is handled directly in controllers with actor role attribution.
 * - GET  /                    — List all loans (ADMIN + MANAGER)
 * - GET  /:id                 — Get loan by ID (ADMIN + MANAGER)
 * - POST /                    — Create loan (ADMIN + MANAGER)
 * - PUT  /:id                 — Update loan (ADMIN only)
 * - PUT  /installments/:id    — Update installment (ADMIN only)
 */
const express_1 = require("express");
const loans_controller_1 = require("../controllers/loans.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read endpoints — both ADMIN and MANAGER
router.get('/', loans_controller_1.getLoans);
router.get('/:id', loans_controller_1.getLoan);
// Create — both ADMIN and MANAGER (audit logged in controller with role attribution)
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), loans_controller_1.createLoan);
// Update and installment update — ADMIN only (audit logged in controller with role attribution)
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), loans_controller_1.updateLoan);
router.put('/installments/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), loans_controller_1.updateInstallment);
exports.default = router;
