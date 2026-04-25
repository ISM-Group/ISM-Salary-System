import { Response } from 'express';
import { query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

// ---------------------------------------------------------------------------
// Helper: resolve the employee record linked to the authenticated user
// ---------------------------------------------------------------------------

/**
 * Looks up the employee record associated with the current authenticated user.
 * The mapping uses the `user_id` column on the employees table.
 * Falls back to matching by username/email if user_id is not set.
 *
 * @returns The employee row or null
 */
// PUBLIC_INTERFACE
async function resolveEmployeeForUser(req: AuthRequest): Promise<any | null> {
  if (!req.user) return null;

  // Primary: direct user_id link
  let employee = await queryOne<any>(
    `SELECT e.id, e.employee_id AS employeeCode, e.full_name AS fullName, e.email,
            e.salary_type AS salaryType, e.base_salary AS baseSalary,
            d.name AS departmentName, r.name AS roleName
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.user_id = ? AND e.is_active = TRUE
     LIMIT 1`,
    [req.user.id],
  );

  if (employee) return employee;

  // Fallback: match by username or email (for systems that haven't set user_id yet)
  employee = await queryOne<any>(
    `SELECT e.id, e.employee_id AS employeeCode, e.full_name AS fullName, e.email,
            e.salary_type AS salaryType, e.base_salary AS baseSalary,
            d.name AS departmentName, r.name AS roleName
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE (e.email = ? OR e.full_name = ?) AND e.is_active = TRUE
     LIMIT 1`,
    [req.user.username, req.user.full_name],
  );

  return employee || null;
}

// PUBLIC_INTERFACE
/**
 * GET /api/self-service/profile
 * Returns the employee profile linked to the authenticated user.
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await resolveEmployeeForUser(req);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to your account. Contact admin.' });
    return;
  }
  res.json({ data: employee });
};

// PUBLIC_INTERFACE
/**
 * GET /api/self-service/salary-history
 * Returns salary history for the authenticated employee.
 */
export const getMySalaryHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await resolveEmployeeForUser(req);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to your account.' });
    return;
  }

  const rows = await query<any>(
    `SELECT id, month, daily_wage_total AS gross, bonus, advance_deductions AS advanceDeductions,
            loan_deductions AS loanDeductions, total_salary AS totalSalary, status
     FROM salary_calculations
     WHERE employee_id = ?
     ORDER BY month DESC
     LIMIT 24`,
    [employee.id],
  );

  res.json({
    data: rows.map((r: any) => ({
      ...r,
      gross: Number(r.gross || 0),
      bonus: Number(r.bonus || 0),
      advanceDeductions: Number(r.advanceDeductions || 0),
      loanDeductions: Number(r.loanDeductions || 0),
      totalSalary: Number(r.totalSalary || 0),
    })),
  });
};

// PUBLIC_INTERFACE
/**
 * GET /api/self-service/attendance?from=...&to=...
 * Returns attendance records for the authenticated employee.
 */
export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await resolveEmployeeForUser(req);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to your account.' });
    return;
  }

  const { from, to } = req.query as Record<string, string | undefined>;
  let sql = `SELECT id, date, status, notes FROM attendance WHERE employee_id = ?`;
  const params: unknown[] = [employee.id];
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date DESC LIMIT 365';

  const rows = await query<any>(sql, params);
  res.json({ data: rows });
};

// PUBLIC_INTERFACE
/**
 * GET /api/self-service/loans
 * Returns loans for the authenticated employee.
 */
export const getMyLoans = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await resolveEmployeeForUser(req);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to your account.' });
    return;
  }

  const rows = await query<any>(
    `SELECT id, loan_amount AS loanAmount, remaining_balance AS remainingBalance,
            status, repayment_mode AS repaymentMode, daily_repayment_amount AS dailyRepaymentAmount,
            created_at AS createdAt
     FROM loans WHERE employee_id = ? ORDER BY created_at DESC`,
    [employee.id],
  );

  res.json({
    data: rows.map((r: any) => ({
      ...r,
      loanAmount: Number(r.loanAmount || 0),
      remainingBalance: Number(r.remainingBalance || 0),
      dailyRepaymentAmount: Number(r.dailyRepaymentAmount || 0),
    })),
  });
};

// PUBLIC_INTERFACE
/**
 * GET /api/self-service/payslip?month=YYYY-MM
 * Returns the payslip HTML for the authenticated employee for a given month.
 */
export const getMyPayslip = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await resolveEmployeeForUser(req);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to your account.' });
    return;
  }

  // Re-route to the exports payslip endpoint logic
  // by setting params.employeeId and forwarding
  req.params.employeeId = employee.id;

  // Import and delegate to the payslip generator
  const { generatePayslip } = await import('./exports.controller.js');
  await generatePayslip(req, res);
};
