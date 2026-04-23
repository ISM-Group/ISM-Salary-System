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
import { Router } from 'express';
import {
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  updateInstallment,
  settleLoan,
  extendLoan,
} from '../controllers/loans.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createLoanSchema,
  updateLoanSchema,
  updateInstallmentSchema,
  settleLoanSchema,
  extendLoanSchema,
} from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// List and view — both ADMIN and MANAGER
router.get('/', getLoans);
router.get('/:id', getLoan);

// Create — both ADMIN and MANAGER
router.post('/', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(createLoanSchema), createLoan);

// Update — ADMIN only
router.put('/:id', authorize(UserRole.ADMIN), validate(updateLoanSchema), updateLoan);

// Installment update — ADMIN only
router.put('/installments/:id', authorize(UserRole.ADMIN), validate(updateInstallmentSchema), updateInstallment);

// Settle and extend — ADMIN only
router.post('/:id/settle', authorize(UserRole.ADMIN), validate(settleLoanSchema), settleLoan);
router.post('/:id/extend', authorize(UserRole.ADMIN), validate(extendLoanSchema), extendLoan);

export default router;
