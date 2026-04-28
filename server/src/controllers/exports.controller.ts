import { Response } from 'express';
import { query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function toHtmlTable(rows: Record<string, unknown>[], columns: { key: string; label: string }[], title: string): string {
  const headerCells = columns.map((c) => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;text-align:left;">${c.label}</th>`).join('');
  const bodyRows = rows.map((row) => `<tr>${columns.map((c) => `<td style="border:1px solid #eee;padding:6px 10px;">${row[c.key] ?? ''}</td>`).join('')}</tr>`).join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  h1 { font-size: 18px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 13px; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${title}</h1>
<p>Generated: ${new Date().toISOString()}</p>
<table>${headerCells}${bodyRows}</table>
</body></html>`;
}

export const exportPayroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { format, employeeId, from, to } = req.query as Record<string, string | undefined>;

    let sql = `
      SELECT sr.id, sr.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
             sr.period_start AS periodStart, sr.period_end AS periodEnd, sr.release_type AS releaseType,
             sr.salary_type AS salaryType, sr.gross_amount AS gross, sr.absent_deduction AS absentDeduction,
             sr.advance_deductions AS advanceDeductions, sr.loan_deductions AS loanDeductions,
             sr.bonus, sr.calculated_net AS calculatedNet, sr.released_amount AS releasedAmount, sr.status
      FROM salary_releases sr
      INNER JOIN employees e ON e.id = sr.employee_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (employeeId) { sql += ' AND sr.employee_id = ?'; params.push(employeeId); }
    if (from) { sql += ' AND sr.period_start >= ?'; params.push(from); }
    if (to) { sql += ' AND sr.period_end <= ?'; params.push(to); }
    sql += ' ORDER BY sr.period_start DESC, e.full_name ASC';

    const rows = await query<any>(sql, params);
    const data = rows.map((r: any) => ({
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      releaseType: r.releaseType,
      salaryType: r.salaryType,
      gross: Number(r.gross || 0).toFixed(2),
      absentDeduction: Number(r.absentDeduction || 0).toFixed(2),
      advanceDeductions: Number(r.advanceDeductions || 0).toFixed(2),
      loanDeductions: Number(r.loanDeductions || 0).toFixed(2),
      bonus: Number(r.bonus || 0).toFixed(2),
      calculatedNet: Number(r.calculatedNet || 0).toFixed(2),
      releasedAmount: Number(r.releasedAmount || 0).toFixed(2),
      status: r.status,
    }));

    const columns = [
      { key: 'employeeCode', label: 'Employee ID' },
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'periodStart', label: 'Period Start' },
      { key: 'periodEnd', label: 'Period End' },
      { key: 'releaseType', label: 'Release Type' },
      { key: 'salaryType', label: 'Salary Type' },
      { key: 'gross', label: 'Gross' },
      { key: 'absentDeduction', label: 'Absent Deduction' },
      { key: 'advanceDeductions', label: 'Advance Deductions' },
      { key: 'loanDeductions', label: 'Loan Deductions' },
      { key: 'bonus', label: 'Bonus' },
      { key: 'calculatedNet', label: 'Calculated Net' },
      { key: 'releasedAmount', label: 'Released Amount' },
      { key: 'status', label: 'Status' },
    ];

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(toHtmlTable(data, columns, 'Payroll Report'));
      return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll_report.csv"');
    res.send(toCsv(data, columns));
  } catch (error) {
    console.error('Export payroll error:', error);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
};

export const exportAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { format, employeeId, from, to } = req.query as Record<string, string | undefined>;

    let sql = `
      SELECT a.id, a.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
             a.date, a.status, a.notes, r.name AS roleName
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (employeeId) { sql += ' AND a.employee_id = ?'; params.push(employeeId); }
    if (from) { sql += ' AND a.date >= ?'; params.push(from); }
    if (to) { sql += ' AND a.date <= ?'; params.push(to); }
    sql += ' ORDER BY a.date DESC, e.full_name ASC';

    const rows = await query<any>(sql, params);
    const data = rows.map((r: any) => ({
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      date: r.date,
      status: r.status,
      roleName: r.roleName || '',
      notes: r.notes || '',
    }));

    const columns = [
      { key: 'employeeCode', label: 'Employee ID' },
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'roleName', label: 'Role Worked' },
      { key: 'notes', label: 'Notes' },
    ];

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(toHtmlTable(data, columns, 'Attendance Report'));
      return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.send(toCsv(data, columns));
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
};

export const exportLoans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { format, status, employeeId } = req.query as Record<string, string | undefined>;

    let sql = `
      SELECT l.id, l.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
             l.loan_amount AS loanAmount, l.remaining_balance AS remainingBalance, l.status,
             l.repayment_mode AS repaymentMode, l.daily_repayment_amount AS dailyRepaymentAmount,
             l.created_at AS createdAt
      FROM loans l
      INNER JOIN employees e ON e.id = l.employee_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (employeeId) { sql += ' AND l.employee_id = ?'; params.push(employeeId); }
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    sql += ' ORDER BY l.created_at DESC';

    const rows = await query<any>(sql, params);
    const data = rows.map((r: any) => ({
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      loanAmount: Number(r.loanAmount || 0).toFixed(2),
      remainingBalance: Number(r.remainingBalance || 0).toFixed(2),
      status: r.status,
      repaymentMode: r.repaymentMode,
      dailyRepaymentAmount: Number(r.dailyRepaymentAmount || 0).toFixed(2),
      createdAt: r.createdAt,
    }));

    const columns = [
      { key: 'employeeCode', label: 'Employee ID' },
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'loanAmount', label: 'Loan Amount' },
      { key: 'remainingBalance', label: 'Remaining Balance' },
      { key: 'status', label: 'Status' },
      { key: 'repaymentMode', label: 'Repayment Mode' },
      { key: 'dailyRepaymentAmount', label: 'Daily Repayment Amount' },
      { key: 'createdAt', label: 'Created At' },
    ];

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(toHtmlTable(data, columns, 'Loan Report'));
      return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="loan_report.csv"');
    res.send(toCsv(data, columns));
  } catch (error) {
    console.error('Export loans error:', error);
    res.status(500).json({ error: 'Failed to generate loan report' });
  }
};

export const generatePayslip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  const { employeeId } = req.params;
  const { month } = req.query as { month?: string };

  if (!month) {
    res.status(400).json({ error: 'month query parameter is required (YYYY-MM)' });
    return;
  }

  const employee = await queryOne<any>(
    `SELECT e.id, e.employee_id AS employeeCode, e.full_name AS fullName, e.email, e.phone,
            e.salary_type AS salaryType, e.hire_date AS hireDate,
            d.name AS departmentName, r.name AS roleName
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ?`,
    [employeeId]
  );

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  // Latest salary release for the given month
  const release = await queryOne<any>(
    `SELECT id, period_start, period_end, release_type, salary_type,
            working_days, gross_amount, absent_deduction, advance_deductions,
            loan_deductions, bonus, calculated_net, released_amount, status
     FROM salary_releases
     WHERE employee_id = ? AND DATE_FORMAT(period_start, '%Y-%m') = ?
     ORDER BY created_at DESC LIMIT 1`,
    [employeeId, month]
  );

  const [yr, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const fromDate = `${yr}-${String(mo).padStart(2, '0')}-01`;
  const toDate = `${yr}-${String(mo).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const attendance = await queryOne<any>(
    `SELECT SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS presentDays,
            SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absentDays
     FROM attendance
     WHERE employee_id = ? AND date BETWEEN ? AND ?`,
    [employeeId, fromDate, toDate]
  );

  const gross = Number(release?.gross_amount || 0);
  const bonus = Number(release?.bonus || 0);
  const absentDeduction = Number(release?.absent_deduction || 0);
  const advanceDeductions = Number(release?.advance_deductions || 0);
  const loanDeductions = Number(release?.loan_deductions || 0);
  const releasedAmount = Number(release?.released_amount || 0);
  const presentDays = Number(attendance?.presentDays || 0);
  const absentDays = Number(attendance?.absentDays || 0);
  const monthLabel = new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip - ${employee.fullName} - ${monthLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #3b82f6; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 600; color: #3b82f6; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 13px; }
  .info-grid .label { color: #6b7280; }
  .info-grid .value { font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 12px; border: 1px solid #e5e7eb; }
  th { background: #f9fafb; text-align: left; font-weight: 600; }
  .total-row { font-weight: 700; background: #eff6ff; }
  .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 10px; } }
</style>
</head><body>
<div class="header">
  <h1>ISM Salary System</h1>
  <p>PAYSLIP — ${monthLabel}</p>
</div>
<div class="section">
  <div class="section-title">Employee Information</div>
  <div class="info-grid">
    <span class="label">Employee ID:</span><span class="value">${employee.employeeCode}</span>
    <span class="label">Name:</span><span class="value">${employee.fullName}</span>
    <span class="label">Department:</span><span class="value">${employee.departmentName || 'N/A'}</span>
    <span class="label">Role:</span><span class="value">${employee.roleName || 'N/A'}</span>
    <span class="label">Salary Type:</span><span class="value">${employee.salaryType}</span>
    <span class="label">Email:</span><span class="value">${employee.email || 'N/A'}</span>
  </div>
</div>
<div class="section">
  <div class="section-title">Attendance Summary</div>
  <div class="info-grid">
    <span class="label">Days Present:</span><span class="value">${presentDays}</span>
    <span class="label">Days Absent:</span><span class="value">${absentDays}</span>
    <span class="label">Days in Month:</span><span class="value">${daysInMonth}</span>
    <span class="label">Working Days Paid:</span><span class="value">${release?.working_days ?? 'N/A'}</span>
  </div>
</div>
<div class="section">
  <div class="section-title">Earnings &amp; Deductions</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount (LKR)</th></tr></thead>
    <tbody>
      <tr><td>Gross Earnings</td><td style="text-align:right;">${gross.toFixed(2)}</td></tr>
      ${bonus > 0 ? `<tr><td>Bonus</td><td style="text-align:right;">+${bonus.toFixed(2)}</td></tr>` : ''}
      ${absentDeduction > 0 ? `<tr><td>Absent Deduction</td><td style="text-align:right;">-${absentDeduction.toFixed(2)}</td></tr>` : ''}
      ${advanceDeductions > 0 ? `<tr><td>Advance Deductions</td><td style="text-align:right;">-${advanceDeductions.toFixed(2)}</td></tr>` : ''}
      ${loanDeductions > 0 ? `<tr><td>Loan Deductions</td><td style="text-align:right;">-${loanDeductions.toFixed(2)}</td></tr>` : ''}
      <tr class="total-row"><td>Amount Released</td><td style="text-align:right;">${releasedAmount.toFixed(2)}</td></tr>
    </tbody>
  </table>
</div>
${!release ? '<p style="color:#ef4444;font-size:13px;">⚠ No salary release found for this period.</p>' : ''}
<div class="footer">
  <p>This is a computer-generated payslip. No signature required.</p>
  <p>Generated on ${new Date().toISOString().substring(0, 10)}</p>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
};
