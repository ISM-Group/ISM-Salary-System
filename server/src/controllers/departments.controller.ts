import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

export const getDepartments = async (_req: AuthRequest, res: Response): Promise<void> => {
  const departments = await query(
    `SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments
     ORDER BY name ASC`
  );
  res.json({ data: departments });
};

export const getDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  const department = await queryOne(
    `SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`,
    [req.params.id]
  );

  if (!department) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }

  res.json({ data: department });
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const existing = await queryOne<{ id: string }>('SELECT id FROM departments WHERE name = ?', [name.trim()]);
  if (existing) {
    res.status(409).json({ error: 'department already exists' });
    return;
  }

  const id = generateId();
  await execute(
    `INSERT INTO departments (id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [id, name.trim(), description || null]
  );

  const created = await queryOne(
    `SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`,
    [id]
  );

  res.status(201).json({ data: created });
};

export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body as { name?: string; description?: string };
  const existing = await queryOne<{ id: string }>('SELECT id FROM departments WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }

  await execute(
    `UPDATE departments
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         updated_at = NOW()
     WHERE id = ?`,
    [name?.trim() || null, description ?? null, req.params.id]
  );

  const updated = await queryOne(
    `SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
     FROM departments WHERE id = ?`,
    [req.params.id]
  );

  res.json({ data: updated });
};

export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await queryOne<{ id: string }>('SELECT id FROM departments WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }

  // Prevent deleting a department that still has employees
  try {
    const depCountRow = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [req.params.id]
    );
    const depCount = depCountRow ? parseInt((depCountRow as any).count || '0', 10) : 0;
    if (depCount > 0) {
      res.status(409).json({ error: 'Cannot delete department with assigned employees. Reassign or remove employees first.' });
      return;
    }

    await execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    console.error('Delete department error:', error);
    // Handle foreign key constraint error explicitly
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
      res.status(409).json({ error: 'Cannot delete department; it has related records.' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
