"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalaryHistory = exports.calculateSalary = void 0;
const db_1 = require("../utils/db");
const holidays_controller_1 = require("./holidays.controller");
/**
 * Calculates the number of calendar days in a given month.
 *
 * @param month - A date string (YYYY-MM-DD or YYYY-MM) representing the month
 * @returns Number of days in that month
 */
// PUBLIC_INTERFACE
function getDaysInMonth(month) {
    const d = new Date(month);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
/**
 * Calculates the number of working days in a given month for an employee,
 * accounting for holidays (PAID holidays are non-working days, like weekends).
 * Working days = calendar days - PAID holiday count for the employee.
 *
 * @param employeeId - The employee ID
 * @param month - A date string (YYYY-MM-DD or YYYY-MM) representing the month
 * @returns Number of working days in the month
 */
// PUBLIC_INTERFACE
async function getWorkingDaysInMonth(employeeId, month) {
    const d = new Date(month);
    const year = d.getFullYear();
    const m = d.getMonth();
    const calendarDays = getDaysInMonth(month);
    // Start and end of month
    const from = `${year}-${String(m + 1).padStart(2, '0')}-01`;
    const to = `${year}-${String(m + 1).padStart(2, '0')}-${String(calendarDays).padStart(2, '0')}`;
    // Count PAID holidays for this employee in the month
    const paidHolidayCount = await (0, holidays_controller_1.countEmployeeHolidays)(employeeId, from, to, 'PAID');
    // Working days = calendar days minus paid holidays
    return Math.max(1, calendarDays - paidHolidayCount);
}
/**
 * Auto-calculates advance salary deductions for an employee in a given month.
 * Only APPROVED advances are included in the deduction total.
 * This enforces the business rule that PENDING/REJECTED advances are NOT deducted.
 *
 * @param employeeId - The employee ID
 * @param month - A date string (YYYY-MM-DD or YYYY-MM) representing the month
 * @returns Total approved advance deductions for the month
 */
// PUBLIC_INTERFACE
async function calculateAdvanceDeductions(employeeId, month) {
    const row = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(amount), 0) AS total
     FROM advance_salaries
     WHERE employee_id = ?
       AND DATE_FORMAT(advance_date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')
       AND status = 'APPROVED'`, [employeeId, month]);
    return Number(row?.total || 0);
}
/**
 * Auto-calculates loan deductions for an employee in a given month.
 * Combines two sources:
 * 1. MONTHLY repayment loans: sum of PENDING installments due in this month
 * 2. DAILY repayment loans: sum of loan_deduction from daily_salary_releases
 *    already generated for this month (these track actual daily deductions taken)
 *
 * This enforces the business rule that daily loan deductions only occur on
 * PRESENT days (since daily releases are only generated for PRESENT days).
 *
 * @param employeeId - The employee ID
 * @param month - A date string (YYYY-MM-DD or YYYY-MM) representing the month
 * @returns Total loan deductions for the month
 */
// PUBLIC_INTERFACE
async function calculateLoanDeductions(employeeId, month) {
    // 1. MONTHLY repayment loans: pending installments due this month
    let monthlyLoanDeductions = 0;
    try {
        const monthlyRow = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(li.amount), 0) AS total
       FROM loan_installments li
       INNER JOIN loans l ON l.id = li.loan_id
       WHERE l.employee_id = ?
         AND l.status = 'ACTIVE'
         AND l.repayment_mode = 'MONTHLY'
         AND DATE_FORMAT(li.due_month, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')
         AND li.status = 'PENDING'`, [employeeId, month]);
        monthlyLoanDeductions = Number(monthlyRow?.total || 0);
    }
    catch {
        // Graceful fallback if columns don't exist yet
        monthlyLoanDeductions = 0;
    }
    // 2. DAILY repayment loans: sum of daily loan deductions from released salary records this month
    // These are the actual deductions that were applied on PRESENT days only
    let dailyLoanDeductions = 0;
    try {
        const dailyRow = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(dsr.loan_deduction), 0) AS total
       FROM daily_salary_releases dsr
       WHERE dsr.employee_id = ?
         AND DATE_FORMAT(dsr.release_date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')`, [employeeId, month]);
        dailyLoanDeductions = Number(dailyRow?.total || 0);
    }
    catch {
        // Graceful fallback if table doesn't exist yet
        dailyLoanDeductions = 0;
    }
    const totalLoanDeductions = monthlyLoanDeductions + dailyLoanDeductions;
    return { monthlyLoanDeductions, dailyLoanDeductions, totalLoanDeductions };
}
/**
 * Calculates salary for an employee for a given month.
 *
 * Supports two salary models:
 * - FIXED: base_salary - (daily_deduction_rate × absent_days) - loan_deductions - advance_deductions + bonus
 *   where daily_deduction_rate = base_salary / working_days_in_month (accounts for holidays)
 * - DAILY_WAGE: (daily_wage × calendar_days) - (daily_wage × absent_days) - loan_deductions - advance_deductions + bonus
 *   Holiday days where the employee is not marked absent are paid at full daily wage for PAID holidays.
 *
 * Deductions are auto-calculated from the database:
 * - Advance deductions: sum of APPROVED advance_salaries for the month
 * - Loan deductions: MONTHLY installments due + DAILY loan deductions from daily releases
 *
 * POST /api/salary/calculate
 * Body: { employeeId, month, bonus }
 * @param req - Express request with salary calculation parameters
 * @param res - Express response with calculation result
 */
// PUBLIC_INTERFACE
const calculateSalary = async (req, res) => {
    const { employeeId, month, bonus } = req.body;
    if (!employeeId || !month) {
        res.status(400).json({ error: 'employeeId and month are required' });
        return;
    }
    // Fetch attendance data
    const attendance = await (0, db_1.queryOne)(`SELECT
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentDays,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentDays
     FROM attendance
     WHERE employee_id = ?
       AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')`, [employeeId, month]);
    // Fetch employee details including salary type
    const employee = await (0, db_1.queryOne)(`SELECT e.salary_type as salaryType, 
            COALESCE(e.base_salary, 0) as baseSalary,
            COALESCE(r.daily_wage, 0) as dailyWage
     FROM employees e
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ?`, [employeeId]);
    const presentDays = Number(attendance?.presentDays || 0);
    const absentDays = Number(attendance?.absentDays || 0);
    const calendarDays = getDaysInMonth(month);
    // Calculate working days (calendar days minus holidays) for FIXED salary
    const workingDays = await getWorkingDaysInMonth(employeeId, month);
    // Count paid holidays for this employee in the month
    const d = new Date(month);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const fromDate = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
    const toDate = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(calendarDays).padStart(2, '0')}`;
    const paidHolidayCount = await (0, holidays_controller_1.countEmployeeHolidays)(employeeId, fromDate, toDate, 'PAID');
    let gross = 0;
    let absentDeduction = 0;
    const dailyWage = Number(employee?.dailyWage || 0);
    const baseSalary = Number(employee?.baseSalary || 0);
    const salaryType = employee?.salaryType || 'DAILY_WAGE';
    if (salaryType === 'FIXED') {
        // Fixed salary: base_salary - absent deductions
        gross = baseSalary;
        const dailyDeductionRate = workingDays > 0 ? baseSalary / workingDays : 0;
        absentDeduction = Math.round(dailyDeductionRate * absentDays * 100) / 100;
    }
    else {
        // Daily wage: daily_wage × calendar_days (paid holidays included as working days)
        gross = dailyWage * calendarDays;
        absentDeduction = dailyWage * absentDays;
    }
    // Auto-calculate deductions from the database
    // Only APPROVED advances are deducted (enforcing approval workflow)
    const advanceDeductions = await calculateAdvanceDeductions(employeeId, month);
    // Loan deductions: monthly installments + daily loan deductions from daily releases
    // Daily loan deductions skip ABSENT days because daily releases only generate for PRESENT days
    const { monthlyLoanDeductions, dailyLoanDeductions, totalLoanDeductions } = await calculateLoanDeductions(employeeId, month);
    // Calculate total salary — negative values are allowed per business rules
    const total = gross -
        absentDeduction +
        Number(bonus || 0) -
        advanceDeductions -
        totalLoanDeductions;
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO salary_calculations
     (id, employee_id, month, daily_wage_total, bonus, advance_deductions, loan_deductions, total_salary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW(), NOW())`, [id, employeeId, month, gross, bonus || 0, advanceDeductions, totalLoanDeductions, total]);
    res.status(201).json({
        data: {
            id,
            salaryType,
            gross,
            absentDeduction,
            advanceDeductions,
            loanDeductions: totalLoanDeductions,
            monthlyLoanDeductions,
            dailyLoanDeductions,
            total,
            paidHolidayCount,
            workingDays,
            calendarDays,
            attendance: {
                presentDays,
                absentDays,
            },
        },
    });
};
exports.calculateSalary = calculateSalary;
/**
 * Retrieves salary calculation history, optionally filtered by employee and date range.
 *
 * GET /api/salary/history?employeeId=X&from=YYYY-MM&to=YYYY-MM
 * @param req - Express request with optional query filters
 * @param res - Express response with salary history records
 */
// PUBLIC_INTERFACE
const getSalaryHistory = async (req, res) => {
    const { employeeId, from, to } = req.query;
    let sql = `
    SELECT id, employee_id as employeeId, month, total_salary as totalSalary, status,
           daily_wage_total as dailyWageTotal, bonus, advance_deductions as advanceDeductions,
           loan_deductions as loanDeductions
    FROM salary_calculations
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        sql += ' AND month >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND month <= ?';
        params.push(to);
    }
    sql += ' ORDER BY month DESC';
    const rows = await (0, db_1.query)(sql, params);
    res.json({
        data: rows.map((r) => ({
            ...r,
            totalSalary: Number(r.totalSalary || 0),
            dailyWageTotal: Number(r.dailyWageTotal || 0),
            bonus: Number(r.bonus || 0),
            advanceDeductions: Number(r.advanceDeductions || 0),
            loanDeductions: Number(r.loanDeductions || 0),
        })),
    });
};
exports.getSalaryHistory = getSalaryHistory;
