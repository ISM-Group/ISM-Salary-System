import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, from, to } = req.query as Record<string, string | undefined>;
    let sql = `
      SELECT a.id, a.employee_id as employeeId, a.date, a.status, a.notes,
             a.role_id as roleId, r.name as roleName
      FROM attendance a
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (employeeId) { sql += ' AND a.employee_id = ?'; params.push(employeeId); }
    if (from) { sql += ' AND a.date >= ?'; params.push(from); }
    if (to) { sql += ' AND a.date <= ?'; params.push(to); }
    sql += ' ORDER BY a.date DESC';

    const rows = await query(sql, params);
    res.json({ data: rows });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

export const getDailyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const date = (req.query.date as string | undefined) || today;
    const rows = await query(
      `SELECT a.id, a.employee_id as employeeId, a.status, a.notes,
              a.role_id as roleId, r.name as roleName,
              e.full_name as employeeName, e.employee_id as employeeCode
       FROM attendance a
       INNER JOIN employees e ON e.id = a.employee_id
       LEFT JOIN roles r ON r.id = a.role_id
       WHERE a.date = ?
       ORDER BY e.full_name ASC`,
      [date]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('Get daily attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch daily attendance' });
  }
};

export const createAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, date, status, notes, roleId } = req.body as Record<string, string | undefined>;
    if (!employeeId || !date || !status) {
      res.status(400).json({ error: 'employeeId, date and status are required' });
      return;
    }

    let effectiveRoleId: string | null = roleId || null;
    if (!effectiveRoleId) {
      const emp = await queryOne<{ role_id: string | null }>(
        'SELECT role_id FROM employees WHERE id = ?',
        [employeeId]
      );
      effectiveRoleId = emp?.role_id ?? null;
    }

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    if (existing) {
      await execute(
        'UPDATE attendance SET status = ?, notes = ?, role_id = ?, updated_at = NOW() WHERE id = ?',
        [status, notes || null, effectiveRoleId, existing.id]
      );
      res.json({ message: 'Attendance updated for date' });
      return;
    }

    await execute(
      `INSERT INTO attendance (id, employee_id, role_id, date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [generateId(), employeeId, effectiveRoleId, date, status, notes || null]
    );
    res.status(201).json({ message: 'Attendance created' });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ error: 'Failed to save attendance record' });
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await queryOne<{ id: string }>('SELECT id FROM attendance WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Attendance not found' });
      return;
    }

    const { status, notes, roleId } = req.body as Record<string, string | undefined>;
    await execute(
      `UPDATE attendance
       SET status = COALESCE(?, status),
           notes = COALESCE(?, notes),
           role_id = COALESCE(?, role_id),
           updated_at = NOW()
       WHERE id = ?`,
      [status || null, notes ?? null, roleId || null, req.params.id]
    );
    res.json({ message: 'Attendance updated' });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
};

export const getEmployeeAttendanceCalendar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    if (!from || !to) {
      res.status(400).json({ error: 'from and to are required' });
      return;
    }

    const rows = await query(
      `SELECT a.id, a.date, a.status, a.notes, a.role_id as roleId, r.name as roleName
       FROM attendance a
       LEFT JOIN roles r ON r.id = a.role_id
       WHERE a.employee_id = ? AND a.date BETWEEN ? AND ?
       ORDER BY a.date ASC`,
      [req.params.employeeId, from, to]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('Get attendance calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance calendar' });
  }
};
