"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartment = exports.getDepartments = void 0;
const db_1 = require("../utils/db");
const getDepartments = async (_req, res) => {
    const departments = await (0, db_1.query)(`SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments
     ORDER BY name ASC`);
    res.json({ data: departments });
};
exports.getDepartments = getDepartments;
const getDepartment = async (req, res) => {
    const department = await (0, db_1.queryOne)(`SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`, [req.params.id]);
    if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
    }
    res.json({ data: department });
};
exports.getDepartment = getDepartment;
const createDepartment = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const existing = await (0, db_1.queryOne)('SELECT id FROM departments WHERE name = ?', [name.trim()]);
    if (existing) {
        res.status(409).json({ error: 'department already exists' });
        return;
    }
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO departments (id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`, [id, name.trim(), description || null]);
    const created = await (0, db_1.queryOne)(`SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`, [id]);
    res.status(201).json({ data: created });
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    const { name, description } = req.body;
    const existing = await (0, db_1.queryOne)('SELECT id FROM departments WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Department not found' });
        return;
    }
    await (0, db_1.execute)(`UPDATE departments
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         updated_at = NOW()
     WHERE id = ?`, [name?.trim() || null, description ?? null, req.params.id]);
    const updated = await (0, db_1.queryOne)(`SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`, [req.params.id]);
    res.json({ data: updated });
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM departments WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Department not found' });
        return;
    }
    // Prevent deleting a department that still has employees
    try {
        const depCountRow = await (0, db_1.queryOne)('SELECT COUNT(*) as count FROM employees WHERE department_id = ?', [req.params.id]);
        const depCount = depCountRow ? parseInt(depCountRow.count || '0', 10) : 0;
        if (depCount > 0) {
            res.status(409).json({ error: 'Cannot delete department with assigned employees. Reassign or remove employees first.' });
            return;
        }
        await (0, db_1.execute)('DELETE FROM departments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Department deleted successfully' });
    }
    catch (error) {
        console.error('Delete department error:', error);
        // Handle foreign key constraint error explicitly
        if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
            res.status(409).json({ error: 'Cannot delete department; it has related records.' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteDepartment = deleteDepartment;
