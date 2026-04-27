import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';
import { AuditAction, writeAuditLog } from '../utils/auditLog';

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface EffectiveRate {
  salaryType: 'FIXED' | 'DAILY_WAGE';
  personalRate: number;   // latest history entry base_salary (or fallback)
  baseSalary: number;     // for FIXED: monthly base
}

async function getEffectiveRate(employeeId: string): Promise<EffectiveRate> {
  const emp = await queryOne<any>(
    `SELECT e.salary_type, e.base_salary, r.daily_wage
     FROM employees e
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ?`,
    [employeeId]
  );
  if (!emp) throw new Error('Employee not found');

  const salaryType: 'FIXED' | 'DAILY_WAGE' = emp.salary_type === 'FIXED' ? 'FIXED' : 'DAILY_WAGE';

  // Latest history entry overrides base
  const latest = await queryOne<any>(
    `SELECT base_salary FROM employee_salary_history
     WHERE employee_id = ? AND salary_type = ?
     ORDER BY effective_from DESC LIMIT 1`,
    [employeeId, salaryType]
  );

  const personalRate = latest?.base_salary ?? emp.base_salary ?? emp.daily_wage ?? 0;

  return { salaryType, personalRate, baseSalary: personalRate };
}

interface DayEntry {
  date: string;
  status: 'PRESENT' | 'ABSENT';
  roleId: string | null;
  roleName: string | null;
  roleDailyWage: number;
  personalRate: number;
  effectiveRate: number;
  amount: number;
}

async function buildDailyWagePreview(
  employeeId: string,
  from: string,
  to: string,
  personalRate: number
): Promise<{ dayBreakdown: DayEntry[]; workingDays: number; grossAmount: number; averageDailyRate: number }> {
  const rows = await query<any>(
    `SELECT a.date, a.status, a.role_id as roleId, r.name as roleName,
            COALESCE(r.daily_wage, 0) as roleDailyWage
     FROM attendance a
     LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.employee_id = ? AND a.date BETWEEN ? AND ?
     ORDER BY a.date ASC`,
    [employeeId, from, to]
  );

  let grossAmount = 0;
  let workingDays = 0;
  const dayBreakdown: DayEntry[] = rows.map((r: any) => {
    const roleDailyWage = Number(r.roleDailyWage) || 0;
    const effectiveRate = r.status === 'PRESENT' ? Math.max(personalRate, roleDailyWage) : 0;
    const amount = effectiveRate;
    if (r.status === 'PRESENT') {
      grossAmount += amount;
      workingDays++;
    }
    return {
      date: r.date,
      status: r.status,
      roleId: r.roleId,
      roleName: r.roleName,
      roleDailyWage,
      personalRate,
      effectiveRate,
      amount,
    };
  });

  const averageDailyRate = workingDays > 0 ? grossAmount / workingDays : 0;
  return { dayBreakdown, workingDays, grossAmount, averageDailyRate };
}

interface FixedPreview {
  baseSalary: number;
  absentDays: number;
  paidOffs: number;
  excessAbsent: number;
  absentDeduction: number;
  grossAmount: number;
  workingDays: number;
}

async function buildFixedPreview(
  employeeId: string,
  from: string,
  to: string,
  baseSalary: number
): Promise<FixedPreview> {
  const absentRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM attendance
     WHERE employee_id = ? AND date BETWEEN ? AND ? AND status = 'ABSENT'`,
    [employeeId, from, to]
  );
  const presentRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM attendance
     WHERE employee_id = ? AND date BETWEEN ? AND ? AND status = 'PRESENT'`,
    [employeeId, from, to]
  );

  const absentDays = absentRow?.cnt ?? 0;
  const workingDays = presentRow?.cnt ?? 0;
  const paidOffs = Math.min(4, absentDays);
  const excessAbsent = Math.max(0, absentDays - 4);
  const absentDeduction = Math.round((excessAbsent * (baseSalary / 30)) * 100) / 100;

  return {
    baseSalary,
    absentDays,
    paidOffs,
    excessAbsent,
    absentDeduction,
    grossAmount: baseSalary,
    workingDays,
  };
}

async function calculateAdvanceDeductions(employeeId: string, from: string, to: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM advance_salaries
     WHERE employee_id = ? AND status = 'APPROVED'
       AND advance_date BETWEEN ? AND ?`,
    [employeeId, from, to]
  );
  return Number(row?.total) || 0;
}

async function calculateLoanDeductions(
  employeeId: string,
  from: string,
  to: string,
  workingDays: number,
  isMonthlyPeriod: boolean
): Promise<{ total: number; dailyDeductions: number; monthlyDeductions: number; monthlyInstallmentIds: string[] }> {
  // DAILY repayment: deduct daily_repayment_amount × working_days
  const dailyRow = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(daily_repayment_amount), 0) as total
     FROM loans
     WHERE employee_id = ? AND status = 'ACTIVE' AND repayment_mode = 'DAILY'`,
    [employeeId]
  );
  const dailyDeductions = Math.round((Number(dailyRow?.total) || 0) * workingDays * 100) / 100;

  // MONTHLY repayment: only on monthly-period releases
  let monthlyDeductions = 0;
  let monthlyInstallmentIds: string[] = [];
  if (isMonthlyPeriod) {
    const installments = await query<any>(
      `SELECT li.id, li.amount
       FROM loan_installments li
       INNER JOIN loans l ON l.id = li.loan_id
       WHERE l.employee_id = ? AND l.status = 'ACTIVE'
         AND li.status = 'PENDING'
         AND li.due_month BETWEEN ? AND ?`,
      [employeeId, from, to]
    );
    monthlyDeductions = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    monthlyInstallmentIds = installments.map((i: any) => i.id);
  }

  return {
    total: dailyDeductions + monthlyDeductions,
    dailyDeductions,
    monthlyDeductions,
    monthlyInstallmentIds,
  };
}

function detectReleaseType(from: string, to: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' {
  const start = new Date(from);
  const end = new Date(to);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  if (diffDays === 1) return 'DAILY';
  if (diffDays === 7) return 'WEEKLY';

  // Monthly: starts on 1st, ends on last day of same month
  if (
    start.getDate() === 1 &&
    end.getMonth() === start.getMonth() &&
    end.getFullYear() === start.getFullYear() &&
    end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  ) {
    return 'MONTHLY';
  }

  return 'CUSTOM';
}

// ─── Public handlers ──────────────────────────────────────────────────────────

/** POST /api/salary-releases/preview */
export const previewRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, periodStart, periodEnd, bonus = 0 } = req.body as Record<string, any>;
    if (!employeeId || !periodStart || !periodEnd) {
      res.status(400).json({ error: 'employeeId, periodStart, periodEnd are required' });
      return;
    }

    const { salaryType, personalRate, baseSalary } = await getEffectiveRate(employeeId);
    const releaseType = detectReleaseType(periodStart, periodEnd);
    const isMonthly = releaseType === 'MONTHLY';

    let grossAmount = 0;
    let workingDays = 0;
    let absentDeduction = 0;
    let dayBreakdown: DayEntry[] = [];
    let fixedMeta: FixedPreview | null = null;

    if (salaryType === 'DAILY_WAGE') {
      const preview = await buildDailyWagePreview(employeeId, periodStart, periodEnd, personalRate);
      grossAmount = preview.grossAmount;
      workingDays = preview.workingDays;
      dayBreakdown = preview.dayBreakdown;
    } else {
      fixedMeta = await buildFixedPreview(employeeId, periodStart, periodEnd, baseSalary);
      grossAmount = fixedMeta.grossAmount;
      workingDays = fixedMeta.workingDays;
      absentDeduction = fixedMeta.absentDeduction;
    }

    const advanceDeductions = await calculateAdvanceDeductions(employeeId, periodStart, periodEnd);
    const loans = await calculateLoanDeductions(employeeId, periodStart, periodEnd, workingDays, isMonthly);

    const bonusNum = Number(bonus) || 0;
    const calculatedNet = grossAmount - absentDeduction - advanceDeductions - loans.total + bonusNum;

    res.json({
      data: {
        employeeId,
        periodStart,
        periodEnd,
        releaseType,
        salaryType,
        workingDays,
        grossAmount,
        absentDeduction,
        advanceDeductions,
        loanDeductions: loans.total,
        dailyLoanDeductions: loans.dailyDeductions,
        monthlyLoanDeductions: loans.monthlyDeductions,
        bonus: bonusNum,
        calculatedNet,
        releasedAmount: calculatedNet,
        ...(salaryType === 'DAILY_WAGE' ? { dayBreakdown, averageDailyRate: workingDays > 0 ? grossAmount / workingDays : 0 } : {}),
        ...(fixedMeta ? { absentDays: fixedMeta.absentDays, paidOffs: fixedMeta.paidOffs, excessAbsent: fixedMeta.excessAbsent } : {}),
      },
    });
  } catch (err: any) {
    console.error('previewRelease error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/** POST /api/salary-releases/batch-preview */
export const batchPreview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeIds, periodStart, periodEnd, bonus = 0 } = req.body as Record<string, any>;
    if (!Array.isArray(employeeIds) || !periodStart || !periodEnd) {
      res.status(400).json({ error: 'employeeIds[], periodStart, periodEnd are required' });
      return;
    }

    const previews = await Promise.all(
      employeeIds.map(async (empId: string) => {
        try {
          const { salaryType, personalRate, baseSalary } = await getEffectiveRate(empId);
          const releaseType = detectReleaseType(periodStart, periodEnd);
          const isMonthly = releaseType === 'MONTHLY';

          let grossAmount = 0;
          let workingDays = 0;
          let absentDeduction = 0;

          if (salaryType === 'DAILY_WAGE') {
            const preview = await buildDailyWagePreview(empId, periodStart, periodEnd, personalRate);
            grossAmount = preview.grossAmount;
            workingDays = preview.workingDays;
          } else {
            const fixed = await buildFixedPreview(empId, periodStart, periodEnd, baseSalary);
            grossAmount = fixed.grossAmount;
            workingDays = fixed.workingDays;
            absentDeduction = fixed.absentDeduction;
          }

          const advanceDeductions = await calculateAdvanceDeductions(empId, periodStart, periodEnd);
          const loans = await calculateLoanDeductions(empId, periodStart, periodEnd, workingDays, isMonthly);
          const bonusNum = Number(bonus) || 0;
          const calculatedNet = grossAmount - absentDeduction - advanceDeductions - loans.total + bonusNum;

          return { employeeId: empId, salaryType, releaseType, workingDays, grossAmount, absentDeduction, advanceDeductions, loanDeductions: loans.total, bonus: bonusNum, calculatedNet, releasedAmount: calculatedNet };
        } catch (e: any) {
          return { employeeId: empId, error: e.message };
        }
      })
    );

    res.json({ data: previews });
  } catch (err: any) {
    console.error('batchPreview error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/** POST /api/salary-releases */
export const createRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, periodStart, periodEnd, bonus = 0, releasedAmount, notes } = req.body as Record<string, any>;
    if (!employeeId || !periodStart || !periodEnd) {
      res.status(400).json({ error: 'employeeId, periodStart, periodEnd are required' });
      return;
    }

    const { salaryType, personalRate, baseSalary } = await getEffectiveRate(employeeId);
    const releaseType = detectReleaseType(periodStart, periodEnd);
    const isMonthly = releaseType === 'MONTHLY';

    let grossAmount = 0;
    let workingDays = 0;
    let absentDeduction = 0;

    if (salaryType === 'DAILY_WAGE') {
      const preview = await buildDailyWagePreview(employeeId, periodStart, periodEnd, personalRate);
      grossAmount = preview.grossAmount;
      workingDays = preview.workingDays;
    } else {
      const fixed = await buildFixedPreview(employeeId, periodStart, periodEnd, baseSalary);
      grossAmount = fixed.grossAmount;
      workingDays = fixed.workingDays;
      absentDeduction = fixed.absentDeduction;
    }

    const advanceDeductions = await calculateAdvanceDeductions(employeeId, periodStart, periodEnd);
    const loans = await calculateLoanDeductions(employeeId, periodStart, periodEnd, workingDays, isMonthly);
    const bonusNum = Number(bonus) || 0;
    const calculatedNet = grossAmount - absentDeduction - advanceDeductions - loans.total + bonusNum;
    const finalReleasedAmount = releasedAmount !== undefined ? Number(releasedAmount) : calculatedNet;

    const id = generateId();
    await execute(
      `INSERT INTO salary_releases
         (id, employee_id, period_start, period_end, release_type, salary_type,
          working_days, gross_amount, absent_deduction, advance_deductions,
          loan_deductions, bonus, calculated_net, released_amount, status, notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, NOW(), NOW())`,
      [id, employeeId, periodStart, periodEnd, releaseType, salaryType, workingDays,
       grossAmount, absentDeduction, advanceDeductions, loans.total, bonusNum,
       calculatedNet, finalReleasedAmount, notes || null]
    );

    await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.CREATE, recordId: id, changedBy: req.user!.id });

    res.status(201).json({ data: { id, calculatedNet, releasedAmount: finalReleasedAmount, status: 'DRAFT' } });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'A salary release already exists for this employee and period' });
      return;
    }
    console.error('createRelease error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/** POST /api/salary-releases/batch */
export const batchCreateReleases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeIds, periodStart, periodEnd, bonus = 0, notes } = req.body as Record<string, any>;
    if (!Array.isArray(employeeIds) || !periodStart || !periodEnd) {
      res.status(400).json({ error: 'employeeIds[], periodStart, periodEnd are required' });
      return;
    }

    const results = await Promise.all(
      employeeIds.map(async (empId: string) => {
        try {
          const { salaryType, personalRate, baseSalary } = await getEffectiveRate(empId);
          const releaseType = detectReleaseType(periodStart, periodEnd);
          const isMonthly = releaseType === 'MONTHLY';

          let grossAmount = 0;
          let workingDays = 0;
          let absentDeduction = 0;

          if (salaryType === 'DAILY_WAGE') {
            const preview = await buildDailyWagePreview(empId, periodStart, periodEnd, personalRate);
            grossAmount = preview.grossAmount;
            workingDays = preview.workingDays;
          } else {
            const fixed = await buildFixedPreview(empId, periodStart, periodEnd, baseSalary);
            grossAmount = fixed.grossAmount;
            workingDays = fixed.workingDays;
            absentDeduction = fixed.absentDeduction;
          }

          const advanceDeductions = await calculateAdvanceDeductions(empId, periodStart, periodEnd);
          const loans = await calculateLoanDeductions(empId, periodStart, periodEnd, workingDays, isMonthly);
          const bonusNum = Number(bonus) || 0;
          const calculatedNet = grossAmount - absentDeduction - advanceDeductions - loans.total + bonusNum;

          const id = generateId();
          await execute(
            `INSERT INTO salary_releases
               (id, employee_id, period_start, period_end, release_type, salary_type,
                working_days, gross_amount, absent_deduction, advance_deductions,
                loan_deductions, bonus, calculated_net, released_amount, status, notes,
                created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, NOW(), NOW())`,
            [id, empId, periodStart, periodEnd, releaseType, salaryType, workingDays,
             grossAmount, absentDeduction, advanceDeductions, loans.total, bonusNum,
             calculatedNet, calculatedNet, notes || null]
          );

          await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.CREATE, recordId: id, changedBy: req.user!.id });

          return { employeeId: empId, id, status: 'DRAFT', calculatedNet };
        } catch (e: any) {
          return { employeeId: empId, error: e.message };
        }
      })
    );

    res.status(201).json({ data: results });
  } catch (err: any) {
    console.error('batchCreateReleases error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/** GET /api/salary-releases */
export const getReleases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, from, to, status, departmentId, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    let sql = `
      SELECT sr.id, sr.employee_id as employeeId, sr.period_start as periodStart,
             sr.period_end as periodEnd, sr.release_type as releaseType,
             sr.salary_type as salaryType, sr.working_days as workingDays,
             sr.gross_amount as grossAmount, sr.absent_deduction as absentDeduction,
             sr.advance_deductions as advanceDeductions, sr.loan_deductions as loanDeductions,
             sr.bonus, sr.calculated_net as calculatedNet, sr.released_amount as releasedAmount,
             sr.status, sr.notes, sr.created_at as createdAt, sr.updated_at as updatedAt,
             e.full_name as employeeName, e.employee_id as employeeCode,
             d.name as departmentName, u.full_name as releasedByName
      FROM salary_releases sr
      INNER JOIN employees e ON e.id = sr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = sr.released_by
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (employeeId) { sql += ' AND sr.employee_id = ?'; params.push(employeeId); }
    if (from) { sql += ' AND sr.period_start >= ?'; params.push(from); }
    if (to) { sql += ' AND sr.period_end <= ?'; params.push(to); }
    if (status) { sql += ' AND sr.status = ?'; params.push(status); }
    if (departmentId) { sql += ' AND e.department_id = ?'; params.push(departmentId); }

    const countSql = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as cnt FROM');
    const countRow = await queryOne<{ cnt: number }>(countSql, params);

    sql += ' ORDER BY sr.period_start DESC, e.full_name ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const rows = await query<any>(sql, params);
    res.json({ data: rows, total: countRow?.cnt ?? 0, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    console.error('getReleases error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** GET /api/salary-releases/:id */
export const getRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const release = await queryOne<any>(
      `SELECT sr.*, e.full_name as employeeName, e.employee_id as employeeCode,
              e.salary_type as empSalaryType, d.name as departmentName,
              u.full_name as releasedByName
       FROM salary_releases sr
       INNER JOIN employees e ON e.id = sr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN users u ON u.id = sr.released_by
       WHERE sr.id = ?`,
      [req.params.id]
    );
    if (!release) { res.status(404).json({ error: 'Release not found' }); return; }

    // For DAILY_WAGE releases, re-derive day breakdown
    let dayBreakdown: DayEntry[] = [];
    if (release.salary_type === 'DAILY_WAGE') {
      const { personalRate } = await getEffectiveRate(release.employee_id);
      const preview = await buildDailyWagePreview(
        release.employee_id, release.period_start, release.period_end, personalRate
      );
      dayBreakdown = preview.dayBreakdown;
    }

    res.json({ data: { ...release, dayBreakdown } });
  } catch (err: any) {
    console.error('getRelease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** GET /api/salary-releases/employee/:id */
export const getEmployeeReleases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const rows = await query<any>(
      `SELECT sr.id, sr.period_start as periodStart, sr.period_end as periodEnd,
              sr.release_type as releaseType, sr.salary_type as salaryType,
              sr.working_days as workingDays, sr.gross_amount as grossAmount,
              sr.absent_deduction as absentDeduction, sr.advance_deductions as advanceDeductions,
              sr.loan_deductions as loanDeductions, sr.bonus, sr.calculated_net as calculatedNet,
              sr.released_amount as releasedAmount, sr.status, sr.notes, sr.created_at as createdAt
       FROM salary_releases sr
       WHERE sr.employee_id = ?
       ORDER BY sr.period_start DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, Number(limit), offset]
    );
    res.json({ data: rows });
  } catch (err: any) {
    console.error('getEmployeeReleases error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** GET /api/salary-releases/employee/:id/calendar */
export const getEmployeeCalendar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month } = req.query as Record<string, string>;
    if (!month) { res.status(400).json({ error: 'month (YYYY-MM) is required' }); return; }

    const [year, mon] = month.split('-').map(Number);
    const from = `${year}-${String(mon).padStart(2, '0')}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const attendance = await query<any>(
      `SELECT a.date, a.status, a.role_id as roleId, r.name as roleName
       FROM attendance a
       LEFT JOIN roles r ON r.id = a.role_id
       WHERE a.employee_id = ? AND a.date BETWEEN ? AND ?
       ORDER BY a.date ASC`,
      [req.params.id, from, to]
    );

    const releases = await query<any>(
      `SELECT id, period_start as periodStart, period_end as periodEnd,
              release_type as releaseType, salary_type as salaryType,
              released_amount as releasedAmount, calculated_net as calculatedNet, status
       FROM salary_releases
       WHERE employee_id = ? AND period_start <= ? AND period_end >= ?
       ORDER BY period_start ASC`,
      [req.params.id, to, from]
    );

    res.json({ data: { month, from, to, attendance, releases } });
  } catch (err: any) {
    console.error('getEmployeeCalendar error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/salary-releases/:id */
export const updateRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const release = await queryOne<any>('SELECT id, status FROM salary_releases WHERE id = ?', [req.params.id]);
    if (!release) { res.status(404).json({ error: 'Release not found' }); return; }
    if (release.status !== 'DRAFT') { res.status(400).json({ error: 'Only DRAFT releases can be updated' }); return; }

    const { releasedAmount, notes, bonus } = req.body as Record<string, any>;
    await execute(
      `UPDATE salary_releases
       SET released_amount = COALESCE(?, released_amount),
           notes = COALESCE(?, notes),
           bonus = COALESCE(?, bonus),
           updated_at = NOW()
       WHERE id = ?`,
      [releasedAmount ?? null, notes ?? null, bonus ?? null, req.params.id]
    );

    await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.UPDATE, recordId: req.params.id, changedBy: req.user!.id });
    res.json({ message: 'Release updated' });
  } catch (err: any) {
    console.error('updateRelease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/salary-releases/:id/release  — DRAFT → RELEASED */
export const releasePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const release = await queryOne<any>(
      'SELECT * FROM salary_releases WHERE id = ?',
      [req.params.id]
    );
    if (!release) { res.status(404).json({ error: 'Release not found' }); return; }
    if (release.status !== 'DRAFT') { res.status(400).json({ error: 'Release is already released' }); return; }

    // Mark as RELEASED
    await execute(
      `UPDATE salary_releases SET status = 'RELEASED', released_by = ?, updated_at = NOW() WHERE id = ?`,
      [req.user!.id, req.params.id]
    );

    const employeeId = release.employee_id;
    const loanDeductions = Number(release.loan_deductions) || 0;
    const isMonthly = release.release_type === 'MONTHLY';

    if (loanDeductions > 0) {
      if (isMonthly) {
        // Mark MONTHLY installments as PAID
        const installments = await query<any>(
          `SELECT li.id, li.loan_id FROM loan_installments li
           INNER JOIN loans l ON l.id = li.loan_id
           WHERE l.employee_id = ? AND l.status = 'ACTIVE'
             AND li.status = 'PENDING'
             AND li.due_month BETWEEN ? AND ?`,
          [employeeId, release.period_start, release.period_end]
        );
        for (const inst of installments) {
          await execute(
            `UPDATE loan_installments SET status = 'PAID', paid_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [inst.id]
          );
          // Check if loan is fully paid
          const pending = await queryOne<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM loan_installments WHERE loan_id = ? AND status = 'PENDING'`,
            [inst.loan_id]
          );
          if ((pending?.cnt ?? 0) === 0) {
            await execute(`UPDATE loans SET status = 'PAID', updated_at = NOW() WHERE id = ?`, [inst.loan_id]);
          }
        }
      }

      // For DAILY loans: decrement remaining_balance
      const dailyLoans = await query<any>(
        `SELECT id, remaining_balance, daily_repayment_amount FROM loans
         WHERE employee_id = ? AND status = 'ACTIVE' AND repayment_mode = 'DAILY'`,
        [employeeId]
      );
      const workingDays = Number(release.working_days) || 0;
      for (const loan of dailyLoans) {
        const deducted = Math.min(
          Number(loan.daily_repayment_amount) * workingDays,
          Number(loan.remaining_balance)
        );
        const newBalance = Math.max(0, Number(loan.remaining_balance) - deducted);
        await execute(
          `UPDATE loans SET remaining_balance = ?, status = IF(? <= 0, 'PAID', status), updated_at = NOW() WHERE id = ?`,
          [newBalance, newBalance, loan.id]
        );
      }
    }

    await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.RELEASE, recordId: req.params.id, changedBy: req.user!.id });
    res.json({ message: 'Payment released successfully' });
  } catch (err: any) {
    console.error('releasePayment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/salary-releases/batch-release */
export const batchRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, from, to } = req.body as Record<string, any>;

    let releaseIds: string[] = [];
    if (Array.isArray(ids)) {
      releaseIds = ids;
    } else if (from && to) {
      const rows = await query<any>(
        `SELECT id FROM salary_releases WHERE status = 'DRAFT' AND period_start >= ? AND period_end <= ?`,
        [from, to]
      );
      releaseIds = rows.map((r: any) => r.id);
    } else {
      res.status(400).json({ error: 'Provide ids[] or from+to date range' });
      return;
    }

    const results = await Promise.all(
      releaseIds.map(async (id: string) => {
        try {
          // Reuse releasePayment logic inline
          const release = await queryOne<any>('SELECT * FROM salary_releases WHERE id = ?', [id]);
          if (!release || release.status !== 'DRAFT') return { id, error: 'Not a DRAFT release' };

          await execute(
            `UPDATE salary_releases SET status = 'RELEASED', released_by = ?, updated_at = NOW() WHERE id = ?`,
            [req.user!.id, id]
          );

          await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.RELEASE, recordId: id, changedBy: req.user!.id });
          return { id, status: 'RELEASED' };
        } catch (e: any) {
          return { id, error: e.message };
        }
      })
    );

    res.json({ data: results });
  } catch (err: any) {
    console.error('batchRelease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** DELETE /api/salary-releases/:id */
export const deleteRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const release = await queryOne<any>('SELECT id, status FROM salary_releases WHERE id = ?', [req.params.id]);
    if (!release) { res.status(404).json({ error: 'Release not found' }); return; }
    if (release.status !== 'DRAFT') { res.status(400).json({ error: 'Only DRAFT releases can be deleted' }); return; }

    await execute('DELETE FROM salary_releases WHERE id = ?', [req.params.id]);
    await writeAuditLog({ tableName: 'salary_releases', action: AuditAction.DELETE, recordId: req.params.id, changedBy: req.user!.id });
    res.json({ message: 'Release deleted' });
  } catch (err: any) {
    console.error('deleteRelease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
