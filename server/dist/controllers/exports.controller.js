"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayslip = exports.exportLoans = exports.exportAttendance = exports.exportPayroll = void 0;
const db_1 = require("../utils/db");
const holidays_controller_1 = require("./holidays.controller");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Escapes a value for CSV output (wraps in quotes if it contains commas,
 * newlines, or double-quotes).
 */
function csvEscape(val) {
    if (val === null || val === undefined)
        return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Converts an array of objects into a CSV string.
 */
function toCsv(rows, columns) {
    const header = columns.map((c) => csvEscape(c.label)).join(',');
    const body = rows
        .map((row) => columns.map((c) => csvEscape(row[c.key])).join(','))
        .join('\n');
    return `${header}\n${body}`;
}
/**
 * Generates a simple HTML table from rows (used as an intermediate step
 * for PDF generation on the client side via window.print).
 */
function toHtmlTable(rows, columns, title) {
    const headerCells = columns.map((c) => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;text-align:left;">${c.label}</th>`).join('');
    const bodyRows = rows
        .map((row) => `<tr>${columns.map((c) => `<td style="border:1px solid #eee;padding:6px 10px;">${row[c.key] ?? ''}</td>`).join('')}</tr>`)
        .join('');
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
// ---------------------------------------------------------------------------
// PUBLIC controllers
// ---------------------------------------------------------------------------
// PUBLIC_INTERFACE
/**
 * Export payroll (salary history) as CSV or HTML-for-PDF.
 *
 * GET /api/exports/payroll?format=csv|html&employeeId=...&from=...&to=...
 * @param req - Express request with query filters
 * @param res - Express response streaming the export
 */
const exportPayroll = async (req, res) => {
    const { format, employeeId, from, to } = req.query;
    let sql = `
    SELECT sc.id, sc.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
           sc.month, sc.daily_wage_total AS gross, sc.bonus, sc.advance_deductions AS advanceDeductions,
           sc.loan_deductions AS loanDeductions, sc.total_salary AS totalSalary, sc.status
    FROM salary_calculations sc
    INNER JOIN employees e ON e.id = sc.employee_id
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND sc.employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        sql += ' AND sc.month >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND sc.month <= ?';
        params.push(to);
    }
    sql += ' ORDER BY sc.month DESC, e.full_name ASC';
    const rows = await (0, db_1.query)(sql, params);
    const data = rows.map((r) => ({
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        month: r.month,
        gross: Number(r.gross || 0).toFixed(2),
        bonus: Number(r.bonus || 0).toFixed(2),
        advanceDeductions: Number(r.advanceDeductions || 0).toFixed(2),
        loanDeductions: Number(r.loanDeductions || 0).toFixed(2),
        totalSalary: Number(r.totalSalary || 0).toFixed(2),
        status: r.status,
    }));
    const columns = [
        { key: 'employeeCode', label: 'Employee ID' },
        { key: 'employeeName', label: 'Employee Name' },
        { key: 'month', label: 'Month' },
        { key: 'gross', label: 'Gross' },
        { key: 'bonus', label: 'Bonus' },
        { key: 'advanceDeductions', label: 'Advance Deductions' },
        { key: 'loanDeductions', label: 'Loan Deductions' },
        { key: 'totalSalary', label: 'Total Salary' },
        { key: 'status', label: 'Status' },
    ];
    if (format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(toHtmlTable(data, columns, 'Payroll Report'));
        return;
    }
    // Default: CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll_report.csv"');
    res.send(toCsv(data, columns));
};
exports.exportPayroll = exportPayroll;
// PUBLIC_INTERFACE
/**
 * Export attendance records as CSV or HTML-for-PDF.
 *
 * GET /api/exports/attendance?format=csv|html&employeeId=...&from=...&to=...
 * @param req - Express request with query filters
 * @param res - Express response streaming the export
 */
const exportAttendance = async (req, res) => {
    const { format, employeeId, from, to } = req.query;
    let sql = `
    SELECT a.id, a.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
           a.date, a.status, a.notes
    FROM attendance a
    INNER JOIN employees e ON e.id = a.employee_id
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND a.employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        sql += ' AND a.date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND a.date <= ?';
        params.push(to);
    }
    sql += ' ORDER BY a.date DESC, e.full_name ASC';
    const rows = await (0, db_1.query)(sql, params);
    const data = rows.map((r) => ({
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        date: r.date,
        status: r.status,
        notes: r.notes || '',
    }));
    const columns = [
        { key: 'employeeCode', label: 'Employee ID' },
        { key: 'employeeName', label: 'Employee Name' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
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
};
exports.exportAttendance = exportAttendance;
// PUBLIC_INTERFACE
/**
 * Export loan records as CSV or HTML-for-PDF.
 *
 * GET /api/exports/loans?format=csv|html&status=...&employeeId=...
 * @param req - Express request with query filters
 * @param res - Express response streaming the export
 */
const exportLoans = async (req, res) => {
    const { format, status, employeeId } = req.query;
    let sql = `
    SELECT l.id, l.employee_id AS employeeId, e.full_name AS employeeName, e.employee_id AS employeeCode,
           l.loan_amount AS loanAmount, l.remaining_balance AS remainingBalance, l.status,
           l.repayment_mode AS repaymentMode, l.daily_repayment_amount AS dailyRepaymentAmount,
           l.created_at AS createdAt
    FROM loans l
    INNER JOIN employees e ON e.id = l.employee_id
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND l.employee_id = ?';
        params.push(employeeId);
    }
    if (status) {
        sql += ' AND l.status = ?';
        params.push(status);
    }
    sql += ' ORDER BY l.created_at DESC';
    const rows = await (0, db_1.query)(sql, params);
    const data = rows.map((r) => ({
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
};
exports.exportLoans = exportLoans;
// PUBLIC_INTERFACE
/**
 * Generate a payslip for a specific employee for a given month.
 * Returns HTML that can be printed or saved as PDF from the browser.
 *
 * GET /api/exports/payslip/:employeeId?month=YYYY-MM
 * @param req - Express request with employee ID and month
 * @param res - Express response with payslip HTML
 */
const generatePayslip = async (req, res) => {
    const { employeeId } = req.params;
    const { month } = req.query;
    if (!month) {
        res.status(400).json({ error: 'month query parameter is required (YYYY-MM)' });
        return;
    }
    // Fetch employee details
    const employee = await (0, db_1.queryOne)(`SELECT e.id, e.employee_id AS employeeCode, e.full_name AS fullName, e.email, e.phone,
            e.salary_type AS salaryType, e.base_salary AS baseSalary, e.hire_date AS hireDate,
            d.name AS departmentName, r.name AS roleName, r.daily_wage AS dailyWage
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ?`, [employeeId]);
    if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
    }
    // Fetch salary calculation for the month
    const salaryCalc = await (0, db_1.queryOne)(`SELECT id, month, daily_wage_total AS gross, bonus, advance_deductions AS advanceDeductions,
            loan_deductions AS loanDeductions, total_salary AS totalSalary, status
     FROM salary_calculations
     WHERE employee_id = ? AND DATE_FORMAT(month, '%Y-%m') = ?
     ORDER BY created_at DESC LIMIT 1`, [employeeId, month]);
    // Fetch attendance summary for the month
    const attendance = await (0, db_1.queryOne)(`SELECT
       SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS presentDays,
       SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absentDays
     FROM attendance
     WHERE employee_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`, [employeeId, month]);
    // Paid holidays
    const dParts = month.split('-');
    const yr = parseInt(dParts[0], 10);
    const mo = parseInt(dParts[1], 10);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const fromDate = `${yr}-${String(mo).padStart(2, '0')}-01`;
    const toDate = `${yr}-${String(mo).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    let paidHolidays = 0;
    try {
        paidHolidays = await (0, holidays_controller_1.countEmployeeHolidays)(employeeId, fromDate, toDate, 'PAID');
    }
    catch {
        paidHolidays = 0;
    }
    const presentDays = Number(attendance?.presentDays || 0);
    const absentDays = Number(attendance?.absentDays || 0);
    const gross = Number(salaryCalc?.gross || 0);
    const bonus = Number(salaryCalc?.bonus || 0);
    const advanceDeductions = Number(salaryCalc?.advanceDeductions || 0);
    const loanDeductions = Number(salaryCalc?.loanDeductions || 0);
    const totalSalary = Number(salaryCalc?.totalSalary || 0);
    const monthLabel = new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip - ${employee.fullName} - ${monthLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #3b82f6; }
  .header p { font-size: 12px; color: #666; margin-top: 4px; }
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
  <p>PAYSLIP</p>
  <p>${monthLabel}</p>
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
    <span class="label">Paid Holidays:</span><span class="value">${paidHolidays}</span>
    <span class="label">Days in Month:</span><span class="value">${daysInMonth}</span>
  </div>
</div>

<div class="section">
  <div class="section-title">Earnings & Deductions</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr><td>Gross Earnings</td><td style="text-align:right;">${gross.toFixed(2)}</td></tr>
      <tr><td>Bonus</td><td style="text-align:right;">${bonus.toFixed(2)}</td></tr>
      <tr><td>Advance Deductions</td><td style="text-align:right;">-${advanceDeductions.toFixed(2)}</td></tr>
      <tr><td>Loan Deductions</td><td style="text-align:right;">-${loanDeductions.toFixed(2)}</td></tr>
      <tr class="total-row"><td>Net Salary</td><td style="text-align:right;">${totalSalary.toFixed(2)}</td></tr>
    </tbody>
  </table>
</div>

${!salaryCalc ? '<p style="color:#ef4444;font-size:13px;">⚠ No salary calculation found for this period. Run salary calculation first.</p>' : ''}

<div class="footer">
  <p>This is a computer-generated payslip. No signature required.</p>
  <p>Generated on ${new Date().toISOString().substring(0, 10)}</p>
</div>
</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
};
exports.generatePayslip = generatePayslip;
