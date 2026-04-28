import { Response } from 'express';
import { query, queryOne, execute, generateId } from '../utils/db';
import { AuthRequest } from '../types';

const formatRole = (r: any, department?: any) => ({
  id: r.id,
  name: r.name,
  level: r.level || null,
  departmentId: r.department_id,
  salaryType: r.salary_type ?? 'ANY',
  dailyWage: r.daily_wage ? parseFloat(r.daily_wage) : null,
  monthlyWage: r.monthly_wage ? parseFloat(r.monthly_wage) : null,
  isActive: r.is_active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(department !== undefined && { department }),
});

export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId, salaryType } = req.query;

    let sql = `
      SELECT r.*, d.id as dept_id, d.name as dept_name, d.description as dept_description,
             d.created_at as dept_created_at, d.updated_at as dept_updated_at
      FROM roles r
      INNER JOIN departments d ON r.department_id = d.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (departmentId) {
      conditions.push('r.department_id = ?');
      params.push(departmentId);
    }
    // salaryType filter: return exact match OR 'ANY' roles
    if (salaryType && salaryType !== 'ANY') {
      conditions.push("(r.salary_type = ? OR r.salary_type = 'ANY')");
      params.push(salaryType);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY r.name ASC';

    const roles = await query<any>(sql, params);

    const formattedRoles = roles.map((r: any) =>
      formatRole(r, {
        id: r.dept_id,
        name: r.dept_name,
        description: r.dept_description,
        createdAt: r.dept_created_at,
        updatedAt: r.dept_updated_at,
      })
    );

    res.json({ data: formattedRoles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRolesByDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId } = req.params;
    const { salaryType } = req.query;

    let sql = 'SELECT * FROM roles WHERE department_id = ? AND is_active = TRUE';
    const params: any[] = [departmentId];

    if (salaryType && salaryType !== 'ANY') {
      sql += " AND (salary_type = ? OR salary_type = 'ANY')";
      params.push(salaryType);
    }

    sql += ' ORDER BY name ASC';

    const roles = await query<any>(sql, params);
    res.json({ data: roles.map((r: any) => formatRole(r)) });
  } catch (error) {
    console.error('Get roles by department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const role = await queryOne<any>('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const department = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [role.department_id]);
    res.json({ data: formatRole(role, department) });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { name, departmentId, salaryType, dailyWage, monthlyWage, isActive } = req.body;

    if (!name || !departmentId) {
      return res.status(400).json({ error: 'Role name and department are required' });
    }

    const id = generateId();

    try {
      await execute(
        'INSERT INTO roles (id, name, department_id, salary_type, daily_wage, monthly_wage, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          name,
          departmentId,
          salaryType || 'ANY',
          dailyWage != null ? parseFloat(dailyWage) : null,
          monthlyWage != null ? parseFloat(monthlyWage) : null,
          isActive !== undefined ? isActive : true,
        ]
      );

      const role = await queryOne<any>('SELECT * FROM roles WHERE id = ?', [id]);
      const department = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [departmentId]);

      res.status(201).json({ data: formatRole(role, department) });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Role with this name already exists in this department' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, salaryType, dailyWage, monthlyWage, isActive } = req.body;

    const existing = await queryOne<{ id: string }>('SELECT id FROM roles WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (salaryType !== undefined) {
      updates.push('salary_type = ?');
      params.push(salaryType);
    }
    if (dailyWage !== undefined) {
      updates.push('daily_wage = ?');
      params.push(dailyWage != null ? parseFloat(dailyWage) : null);
    }
    if (monthlyWage !== undefined) {
      updates.push('monthly_wage = ?');
      params.push(monthlyWage != null ? parseFloat(monthlyWage) : null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive);
    }

    if (updates.length === 0) {
      const role = await queryOne<any>('SELECT * FROM roles WHERE id = ?', [id]);
      const department = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [role.department_id]);
      return res.json({ data: formatRole(role, department) });
    }

    params.push(id);

    try {
      await execute(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);

      const role = await queryOne<any>('SELECT * FROM roles WHERE id = ?', [id]);
      const department = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [role.department_id]);

      res.json({ data: formatRole(role, department) });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Role with this name already exists in this department' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await queryOne<{ id: string }>('SELECT id FROM roles WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await execute('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
