"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRole = exports.getRolesByDepartment = exports.getRoles = void 0;
const db_1 = require("../utils/db");
const getRoles = async (req, res) => {
    try {
        const { departmentId } = req.query;
        let sql = `
      SELECT r.*, d.id as dept_id, d.name as dept_name, d.description as dept_description,
             d.created_at as dept_created_at, d.updated_at as dept_updated_at
      FROM roles r
      INNER JOIN departments d ON r.department_id = d.id
    `;
        const params = [];
        if (departmentId) {
            sql += ' WHERE r.department_id = ?';
            params.push(departmentId);
        }
        sql += ' ORDER BY r.name ASC';
        const roles = await (0, db_1.query)(sql, params);
        // Transform to match expected format
        const formattedRoles = roles.map((r) => ({
            id: r.id,
            name: r.name,
            level: r.level || null,
            departmentId: r.department_id,
            dailyWage: r.daily_wage ? parseFloat(r.daily_wage) : null,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            department: {
                id: r.dept_id,
                name: r.dept_name,
                description: r.dept_description,
                createdAt: r.dept_created_at,
                updatedAt: r.dept_updated_at,
            },
        }));
        res.json({ data: formattedRoles });
    }
    catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRoles = getRoles;
const getRolesByDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const roles = await (0, db_1.query)('SELECT * FROM roles WHERE department_id = ? AND is_active = TRUE ORDER BY name ASC', [departmentId]);
        res.json({ data: roles });
    }
    catch (error) {
        console.error('Get roles by department error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRolesByDepartment = getRolesByDepartment;
const getRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await (0, db_1.queryOne)('SELECT * FROM roles WHERE id = ?', [id]);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Get department
        const department = await (0, db_1.queryOne)('SELECT * FROM departments WHERE id = ?', [role.department_id]);
        res.json({
            data: {
                ...role,
                departmentId: role.department_id,
                level: role.level || null,
                dailyWage: role.daily_wage ? parseFloat(role.daily_wage.toString()) : null,
                isActive: role.is_active,
                department,
            },
        });
    }
    catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRole = getRole;
const createRole = async (req, res) => {
    try {
        const { name, level, departmentId, dailyWage, isActive } = req.body;
        if (!name || !departmentId) {
            return res.status(400).json({ error: 'Role name and department are required' });
        }
        const id = (0, db_1.generateId)();
        try {
            // Insert without level column since it doesn't exist in the database
            await (0, db_1.execute)('INSERT INTO roles (id, name, department_id, daily_wage, is_active) VALUES (?, ?, ?, ?, ?)', [
                id,
                name,
                departmentId,
                dailyWage ? parseFloat(dailyWage) : null,
                isActive !== undefined ? isActive : true,
            ]);
            // Get role with department
            const role = await (0, db_1.queryOne)('SELECT * FROM roles WHERE id = ?', [id]);
            const department = await (0, db_1.queryOne)('SELECT * FROM departments WHERE id = ?', [departmentId]);
            res.status(201).json({
                data: {
                    ...role,
                    departmentId: role.department_id,
                    level: role.level || null,
                    dailyWage: role.daily_wage ? parseFloat(role.daily_wage.toString()) : null,
                    isActive: role.is_active,
                    department,
                },
            });
        }
        catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Role with this name already exists in this department' });
            }
            throw error;
        }
    }
    catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level, dailyWage, isActive } = req.body;
        // Check if role exists
        const existing = await (0, db_1.queryOne)('SELECT id FROM roles WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Build update query dynamically
        const updates = [];
        const params = [];
        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        // Skip level update since column doesn't exist in DB
        // If you add the column later, uncomment this:
        // if (level !== undefined) {
        //   updates.push('level = ?');
        //   params.push(level || null);
        // }
        if (dailyWage !== undefined) {
            updates.push('daily_wage = ?');
            params.push(dailyWage ? parseFloat(dailyWage) : null);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(isActive);
        }
        if (updates.length === 0) {
            // No updates, just return existing
            const role = await (0, db_1.queryOne)('SELECT * FROM roles WHERE id = ?', [id]);
            const department = await (0, db_1.queryOne)('SELECT * FROM departments WHERE id = ?', [role.department_id]);
            return res.json({
                data: {
                    ...role,
                    departmentId: role.department_id,
                    level: role.level || null,
                    dailyWage: role.daily_wage ? parseFloat(role.daily_wage.toString()) : null,
                    isActive: role.is_active,
                    department,
                },
            });
        }
        params.push(id);
        try {
            await (0, db_1.execute)(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);
            const role = await (0, db_1.queryOne)('SELECT * FROM roles WHERE id = ?', [id]);
            const department = await (0, db_1.queryOne)('SELECT * FROM departments WHERE id = ?', [role.department_id]);
            res.json({
                data: {
                    ...role,
                    departmentId: role.department_id,
                    level: role.level || null,
                    dailyWage: role.daily_wage ? parseFloat(role.daily_wage.toString()) : null,
                    isActive: role.is_active,
                    department,
                },
            });
        }
        catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Role with this name already exists in this department' });
            }
            throw error;
        }
    }
    catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if role exists
        const existing = await (0, db_1.queryOne)('SELECT id FROM roles WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Role not found' });
        }
        await (0, db_1.execute)('DELETE FROM roles WHERE id = ?', [id]);
        res.json({ message: 'Role deleted successfully' });
    }
    catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteRole = deleteRole;
