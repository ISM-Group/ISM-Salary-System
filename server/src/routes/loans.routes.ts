import { Router } from 'express';
import {
  createLoan,
  getLoan,
  getLoans,
  updateInstallment,
  updateLoan,
} from '../controllers/loans.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuditAction } from '../utils/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', getLoans);
router.get('/:id', getLoan);
router.post('/', authorize(UserRole.ADMIN), auditLog('loans', AuditAction.CREATE), createLoan);
router.put('/:id', authorize(UserRole.ADMIN), auditLog('loans', AuditAction.UPDATE), updateLoan);
router.put(
  '/installments/:id',
  authorize(UserRole.ADMIN),
  auditLog('loan_installments', AuditAction.UPDATE),
  updateInstallment
);

export default router;
