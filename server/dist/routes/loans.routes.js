"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Loans Routes
 *
 * Manages employee loans with MONTHLY and DAILY repayment modes.
 * - GET  /                    — List all loans
 * - GET  /:id                 — Get loan details with installments
 * - POST /                    — Create a new loan
 * - PUT  /:id                 — Update loan
 * - PUT  /installments/:id    — Update a loan installment
 * - POST /:id/settle          — Early-settle a loan
 * - POST /:id/extend          — Extend a MONTHLY loan
 */
const express_1 = require("express");
const loans_controller_1 = require("../controllers/loans.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const schemas_1 = require("../validation/schemas");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// List and view — both ADMIN and MANAGER
router.get('/', loans_controller_1.getLoans);
router.get('/:id', loans_controller_1.getLoan);
// Create — both ADMIN and MANAGER
router.post('/', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.MANAGER), (0, validate_middleware_1.validate)(schemas_1.createLoanSchema), loans_controller_1.createLoan);
// Update — ADMIN only
router.put('/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateLoanSchema), loans_controller_1.updateLoan);
// Installment update — ADMIN only
router.put('/installments/:id', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.updateInstallmentSchema), loans_controller_1.updateInstallment);
// Settle and extend — ADMIN only
router.post('/:id/settle', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.settleLoanSchema), loans_controller_1.settleLoan);
router.post('/:id/extend', (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), (0, validate_middleware_1.validate)(schemas_1.extendLoanSchema), loans_controller_1.extendLoan);
exports.default = router;
