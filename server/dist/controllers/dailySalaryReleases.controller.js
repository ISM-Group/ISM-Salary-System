"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailySalaryReleases = void 0;
const db_1 = require("../utils/db");
const getDailySalaryReleases = async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = await (0, db_1.query)(`SELECT sc.id, sc.employee_id as employeeId, e.full_name as employeeName,
            sc.total_salary as totalSalary, sc.status, sc.month
     FROM salary_calculations sc
     INNER JOIN employees e ON e.id = sc.employee_id
     WHERE DATE(sc.created_at) = ?
     ORDER BY e.full_name ASC`, [date]);
    res.json({
        data: rows.map((row) => ({
            ...row,
            totalSalary: Number(row.totalSalary || 0),
        })),
    });
};
exports.getDailySalaryReleases = getDailySalaryReleases;
