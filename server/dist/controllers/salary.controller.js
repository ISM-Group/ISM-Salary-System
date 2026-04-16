"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalaryHistory = exports.calculateSalary = void 0;
const db_1 = require("../utils/db");
const calculateSalary = async (req, res) => {
    const { employeeId, month, bonus, advanceDeductions, loanDeductions } = req.body;
    if (!employeeId || !month) {
        res.status(400).json({ error: 'employeeId and month are required' });
        return;
    }
    const attendance = await (0, db_1.queryOne)(`SELECT
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentDays,
      SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END) as halfDays
     FROM attendance
     WHERE employee_id = ?
       AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')`, [employeeId, month]);
    const roleDailyWage = await (0, db_1.queryOne)(`SELECT COALESCE(r.daily_wage, 0) as dailyWage
     FROM employees e
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ?`, [employeeId]);
    const gross = (Number(attendance?.presentDays || 0) + Number(attendance?.halfDays || 0) * 0.5) * Number(roleDailyWage?.dailyWage || 0);
    const total = gross +
        Number(bonus || 0) -
        Number(advanceDeductions || 0) -
        Number(loanDeductions || 0);
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO salary_calculations
     (id, employee_id, month, daily_wage_total, bonus, advance_deductions, loan_deductions, total_salary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW(), NOW())`, [id, employeeId, month, gross, bonus || 0, advanceDeductions || 0, loanDeductions || 0, total]);
    res.status(201).json({
        data: {
            id,
            gross,
            total,
            attendance: {
                presentDays: Number(attendance?.presentDays || 0),
                halfDays: Number(attendance?.halfDays || 0),
            },
        },
    });
};
exports.calculateSalary = calculateSalary;
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
