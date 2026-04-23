/**
 * Export Routes
 *
 * Provides CSV and HTML (printable/PDF) exports for payroll, attendance, and loan data.
 * Also includes payslip generation per employee per period.
 *
 * - GET /payroll          — Export payroll data (CSV or HTML)
 * - GET /attendance       — Export attendance data (CSV or HTML)
 * - GET /loans            — Export loan data (CSV or HTML)
 * - GET /payslip/:employeeId — Generate printable payslip for an employee
 */
import { Router } from 'express';
import {
  exportPayroll,
  exportAttendance,
  exportLoans,
  generatePayslip,
} from '../controllers/exports.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Report exports — accessible to ADMIN and MANAGER
router.get('/payroll', exportPayroll);
router.get('/attendance', exportAttendance);
router.get('/loans', exportLoans);

// Payslip generation — accessible to ADMIN and MANAGER
router.get('/payslip/:employeeId', generatePayslip);

export default router;
