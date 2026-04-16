"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSalaryHistoryEntry = exports.getSalaryHistoryByEmployee = void 0;
const db_1 = require("../utils/db");
const getSalaryHistoryByEmployee = async (req, res) => {
    const rows = await (0, db_1.query)(`SELECT id, employee_id as employeeId, effective_from as effectiveFrom, salary_type as salaryType,
            base_salary as baseSalary, reason, notes, changed_by as changedBy, changed_at as changedAt
     FROM employee_salary_history
     WHERE employee_id = ?
     ORDER BY effective_from DESC`, [req.params.employeeId]);
    res.json({
        data: rows.map((r) => ({ ...r, baseSalary: Number(r.baseSalary || 0) })),
    });
};
exports.getSalaryHistoryByEmployee = getSalaryHistoryByEmployee;
const createSalaryHistoryEntry = async (req, res) => {
    const { effectiveFrom, salaryType, baseSalary, reason, notes } = req.body;
    if (!effectiveFrom || !salaryType || baseSalary === undefined || !reason) {
        res.status(400).json({ error: 'effectiveFrom, salaryType, baseSalary and reason are required' });
        return;
    }
    if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO employee_salary_history
     (id, employee_id, effective_from, salary_type, base_salary, reason, notes, changed_by, changed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [id, req.params.employeeId, effectiveFrom, salaryType, baseSalary, reason, notes || null, req.user.id]);
    res.status(201).json({ data: { id } });
};
exports.createSalaryHistoryEntry = createSalaryHistoryEntry;
