"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHoliday = exports.updateHoliday = exports.createHoliday = exports.getHoliday = exports.getHolidays = void 0;
const db_1 = require("../utils/db");
const getHolidays = async (req, res) => {
    const { from, to } = req.query;
    let sql = `SELECT id, date, name, type, scope, created_at as createdAt, updated_at as updatedAt FROM holidays WHERE 1=1`;
    const params = [];
    if (from) {
        sql += ' AND date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND date <= ?';
        params.push(to);
    }
    sql += ' ORDER BY date ASC';
    res.json({ data: await (0, db_1.query)(sql, params) });
};
exports.getHolidays = getHolidays;
const getHoliday = async (req, res) => {
    const row = await (0, db_1.queryOne)(`SELECT id, date, name, type, scope, created_at as createdAt, updated_at as updatedAt
     FROM holidays WHERE id = ?`, [req.params.id]);
    if (!row) {
        res.status(404).json({ error: 'Holiday not found' });
        return;
    }
    res.json({ data: row });
};
exports.getHoliday = getHoliday;
const createHoliday = async (req, res) => {
    const { date, name, type, scope } = req.body;
    if (!date || !name || !type) {
        res.status(400).json({ error: 'date, name and type are required' });
        return;
    }
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO holidays (id, date, name, type, scope, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`, [id, date, name, type, scope || 'GLOBAL']);
    res.status(201).json({ data: { id } });
};
exports.createHoliday = createHoliday;
const updateHoliday = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM holidays WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Holiday not found' });
        return;
    }
    const { date, name, type, scope } = req.body;
    await (0, db_1.execute)(`UPDATE holidays
     SET date = COALESCE(?, date),
         name = COALESCE(?, name),
         type = COALESCE(?, type),
         scope = COALESCE(?, scope),
         updated_at = NOW()
     WHERE id = ?`, [date || null, name || null, type || null, scope || null, req.params.id]);
    res.json({ message: 'Holiday updated' });
};
exports.updateHoliday = updateHoliday;
const deleteHoliday = async (req, res) => {
    await (0, db_1.execute)('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    res.json({ message: 'Holiday deleted' });
};
exports.deleteHoliday = deleteHoliday;
