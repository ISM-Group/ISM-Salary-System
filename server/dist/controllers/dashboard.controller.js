"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivity = exports.getLoanBreakdown = exports.getAttendanceStats = exports.getDepartmentDistribution = exports.getSalaryTrends = exports.getStats = void 0;
const db_1 = require("../utils/db");
const getStats = async (req, res) => {
    try {
        // Get total employees
        const totalEmployees = await (0, db_1.queryOne)('SELECT COUNT(*) as count FROM employees WHERE is_active = TRUE');
        // Get active loans - use loan_amount (remaining amount would need complex calculation)
        const activeLoans = await (0, db_1.queryOne)(`SELECT COUNT(*) as count, COALESCE(SUM(loan_amount), 0) as total 
       FROM loans WHERE status = 'ACTIVE'`);
        // Get advances for current month (advance_salaries doesn't have status, so get all for current month)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const pendingAdvances = await (0, db_1.queryOne)(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM advance_salaries 
       WHERE DATE_FORMAT(advance_date, '%Y-%m') = ?`, [currentMonth]);
        // Get monthly salary total (current month) - use month column and total_salary
        const monthlySalary = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_salary), 0) as total 
       FROM salary_calculations 
       WHERE DATE_FORMAT(month, '%Y-%m') = ?`, [currentMonth]);
        // Get previous month salary for trend
        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const prevMonthStr = previousMonth.toISOString().slice(0, 7);
        const previousSalary = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_salary), 0) as total 
       FROM salary_calculations 
       WHERE DATE_FORMAT(month, '%Y-%m') = ?`, [prevMonthStr]);
        const salaryTrend = previousSalary?.total
            ? ((monthlySalary?.total || 0) - (previousSalary.total || 0)) / (previousSalary.total || 1) * 100
            : 0;
        res.json({
            data: {
                totalEmployees: totalEmployees?.count || 0,
                activeLoans: {
                    count: activeLoans?.count || 0,
                    total: activeLoans?.total || 0,
                },
                pendingAdvances: {
                    count: pendingAdvances?.count || 0,
                    total: pendingAdvances?.total || 0,
                },
                monthlySalary: {
                    total: monthlySalary?.total || 0,
                    trend: salaryTrend,
                },
            },
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getStats = getStats;
const getSalaryTrends = async (req, res) => {
    try {
        const months = parseInt(req.query.months, 10) || 6;
        // Get salary data for the last N months - use month column and total_salary
        const sql = `
      SELECT 
        DATE_FORMAT(month, '%Y-%m') as month,
        SUM(total_salary) as total,
        COUNT(*) as count
      FROM salary_calculations
      WHERE month >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(month, '%Y-%m')
      ORDER BY month ASC
    `;
        const trends = await (0, db_1.query)(sql, [months]);
        res.json({
            data: trends.map((t) => ({
                month: t.month,
                total: parseFloat(t.total || 0),
                count: parseInt(t.count || 0),
            })),
        });
    }
    catch (error) {
        console.error('Get salary trends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSalaryTrends = getSalaryTrends;
const getDepartmentDistribution = async (req, res) => {
    try {
        const sql = `
      SELECT 
        d.id,
        d.name,
        COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = TRUE
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC
    `;
        const distribution = await (0, db_1.query)(sql);
        const total = distribution.reduce((sum, dept) => sum + parseInt(dept.employee_count || 0), 0);
        res.json({
            data: distribution.map((d) => ({
                id: d.id,
                name: d.name,
                count: parseInt(d.employee_count || 0),
                percentage: total > 0 ? (parseInt(d.employee_count || 0) / total) * 100 : 0,
            })),
        });
    }
    catch (error) {
        console.error('Get department distribution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDepartmentDistribution = getDepartmentDistribution;
const getAttendanceStats = async (req, res) => {
    try {
        const months = parseInt(req.query.months, 10) || 6;
        const sql = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END) as late,
        COUNT(*) as total
      FROM attendance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    `;
        const stats = await (0, db_1.query)(sql, [months]);
        res.json({
            data: stats.map((s) => ({
                month: s.month,
                present: parseInt(s.present || 0),
                absent: parseInt(s.absent || 0),
                late: parseInt(s.late || 0),
                total: parseInt(s.total || 0),
            })),
        });
    }
    catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAttendanceStats = getAttendanceStats;
const getLoanBreakdown = async (req, res) => {
    try {
        const sql = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(loan_amount), 0) as total_amount
      FROM loans
      GROUP BY status
    `;
        const breakdown = await (0, db_1.query)(sql);
        res.json({
            data: breakdown.map((b) => ({
                status: b.status,
                count: parseInt(b.count || 0),
                totalAmount: parseFloat(b.total_amount || 0),
            })),
        });
    }
    catch (error) {
        console.error('Get loan breakdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLoanBreakdown = getLoanBreakdown;
const getRecentActivity = async (req, res) => {
    try {
        const limitParam = req.query.limit;
        const limitValue = Array.isArray(limitParam) ? limitParam[0] : limitParam;
        const limit = parseInt(String(limitValue || '10'), 10);
        const sql = `
      SELECT 
        al.id,
        al.table_name as tableName,
        al.action,
        al.changed_at as timestamp,
        u.username,
        u.full_name as userFullName
      FROM audit_logs al
      LEFT JOIN users u ON al.changed_by = u.id
      ORDER BY al.changed_at DESC
      LIMIT ?
    `;
        const activities = await (0, db_1.query)(sql, [limit]);
        res.json({
            data: activities.map((a) => ({
                id: a.id,
                action: `${a.action} ${a.tableName}`,
                timestamp: a.timestamp,
                user: a.username || 'System',
                userFullName: a.userFullName,
            })),
        });
    }
    catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRecentActivity = getRecentActivity;
