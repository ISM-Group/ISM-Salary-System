"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalaryHistory = exports.calculateSalary = void 0;
const db_1 = require("../utils/db");
const holidays_controller_1 = require("./holidays.controller");
const pagination_1 = require("../utils/pagination");
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
        monthlyLoanDeductions = 0;
    }
    // 2. DAILY repayment loans: sum of daily loan deductions from released salary records this month
    let dailyLoanDeductions = 0;
    try {
        const dailyRow = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(dsr.loan_deduction), 0) AS total
       FROM daily_salary_releases dsr
       WHERE dsr.employee_id = ?
         AND DATE_FORMAT(dsr.release_date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')`, [employeeId, month]);
        dailyLoanDeductions = Number(dailyRow?.total || 0);
    }
    catch {
        dailyLoanDeductions = 0;
    }
    const totalLoanDeductions = monthlyLoanDeductions + dailyLoanDeductions;
    return { monthlyLoanDeductions, dailyLoanDeductions, totalLoanDeductions };
}
/**
 * Calculates salary for an employee for a given month.
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
        gross = baseSalary;
        const dailyDeductionRate = workingDays > 0 ? baseSalary / workingDays : 0;
        absentDeduction = Math.round(dailyDeductionRate * absentDays * 100) / 100;
    }
    else {
        gross = dailyWage * calendarDays;
        absentDeduction = dailyWage * absentDays;
    }
    // Auto-calculate deductions from the database
    const advanceDeductions = await calculateAdvanceDeductions(employeeId, month);
    const { monthlyLoanDeductions, dailyLoanDeductions, totalLoanDeductions } = await calculateLoanDeductions(employeeId, month);
    // Calculate total salary
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
 * Retrieves salary calculation history with server-side pagination.
 *
 * GET /api/salary/history?employeeId=X&from=YYYY-MM&to=YYYY-MM&page=&limit=
 * @param req - Express request with optional query filters
 * @param res - Express response with salary history records
 */
// PUBLIC_INTERFACE
const getSalaryHistory = async (req, res) => {
    const { employeeId, from, to } = req.query;
    const pagination = (0, pagination_1.parsePagination)(req.query);
    const selectFields = `sc.id, sc.employee_id as employeeId, e.full_name as employeeName,
           e.employee_id as employeeCode,
           sc.month, sc.total_salary as totalSalary, sc.status,
           sc.daily_wage_total as dailyWageTotal, sc.bonus,
           sc.advance_deductions as advanceDeductions,
           sc.loan_deductions as loanDeductions`;
    const fromClause = `FROM salary_calculations sc LEFT JOIN employees e ON e.id = sc.employee_id`;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (employeeId) {
        whereClause += ' AND sc.employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        whereClause += ' AND sc.month >= ?';
        params.push(from);
    }
    if (to) {
        whereClause += ' AND sc.month <= ?';
        params.push(to);
    }
    const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
    const total = Number(countResult?.total || 0);
    const dataSql = `SELECT ${selectFields} ${fromClause} ${whereClause} ORDER BY sc.month DESC LIMIT ? OFFSET ?`;
    const rows = await (0, db_1.query)(dataSql, [...params, pagination.limit, pagination.offset]);
    res.json({
        data: rows.map((r) => ({
            ...r,
            totalSalary: Number(r.totalSalary || 0),
            dailyWageTotal: Number(r.dailyWageTotal || 0),
            bonus: Number(r.bonus || 0),
            advanceDeductions: Number(r.advanceDeductions || 0),
            loanDeductions: Number(r.loanDeductions || 0),
        })),
        pagination: (0, pagination_1.buildPaginationMeta)(total, pagination),
    });
};
exports.getSalaryHistory = getSalaryHistory;
