"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeAttendanceCalendar = exports.updateAttendance = exports.createAttendance = exports.getDailyAttendance = exports.getAttendance = void 0;
const db_1 = require("../utils/db");
const getAttendance = async (req, res) => {
    const { employeeId, from, to } = req.query;
    let sql = `
    SELECT id, employee_id as employeeId, date, status, notes
    FROM attendance
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        sql += ' AND date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND date <= ?';
        params.push(to);
    }
    sql += ' ORDER BY date DESC';
    const rows = await (0, db_1.query)(sql, params);
    res.json({ data: rows });
};
exports.getAttendance = getAttendance;
const getDailyAttendance = async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = await (0, db_1.query)(`SELECT a.id, a.employee_id as employeeId, a.status, a.notes,
            e.full_name as employeeName, e.employee_id as employeeCode
     FROM attendance a
     INNER JOIN employees e ON e.id = a.employee_id
     WHERE a.date = ?
     ORDER BY e.full_name ASC`, [date]);
    res.json({ data: rows });
};
exports.getDailyAttendance = getDailyAttendance;
const createAttendance = async (req, res) => {
    const { employeeId, date, status, notes } = req.body;
    if (!employeeId || !date || !status) {
        res.status(400).json({ error: 'employeeId, date and status are required' });
        return;
    }
    const existing = await (0, db_1.queryOne)('SELECT id FROM attendance WHERE employee_id = ? AND date = ?', [employeeId, date]);
    if (existing) {
        await (0, db_1.execute)('UPDATE attendance SET status = ?, notes = ? WHERE id = ?', [status, notes || null, existing.id]);
        res.json({ message: 'Attendance updated for date' });
        return;
    }
    await (0, db_1.execute)(`INSERT INTO attendance (id, employee_id, date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`, [(0, db_1.generateId)(), employeeId, date, status, notes || null]);
    res.status(201).json({ message: 'Attendance created' });
};
exports.createAttendance = createAttendance;
const updateAttendance = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM attendance WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Attendance not found' });
        return;
    }
    const { status, notes } = req.body;
    await (0, db_1.execute)(`UPDATE attendance SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = NOW() WHERE id = ?`, [status || null, notes ?? null, req.params.id]);
    res.json({ message: 'Attendance updated' });
};
exports.updateAttendance = updateAttendance;
const getEmployeeAttendanceCalendar = async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        res.status(400).json({ error: 'from and to are required' });
        return;
    }
    const rows = await (0, db_1.query)(`SELECT id, date, status, notes
     FROM attendance
     WHERE employee_id = ? AND date BETWEEN ? AND ?
     ORDER BY date ASC`, [req.params.employeeId, from, to]);
    res.json({ data: rows });
};
exports.getEmployeeAttendanceCalendar = getEmployeeAttendanceCalendar;
