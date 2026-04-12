import { Response } from 'express';
import { execute, generateId, query } from '../utils/db';
import { AuthRequest } from '../types';

export const getSalaryHistoryByEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await query<any>(
    `SELECT id, employee_id as employeeId, effective_from as effectiveFrom, salary_type as salaryType,
            base_salary as baseSalary, reason, notes, changed_by as changedBy, changed_at as changedAt
     FROM employee_salary_history
     WHERE employee_id = ?
     ORDER BY effective_from DESC`,
    [req.params.employeeId]
  );

  res.json({
    data: rows.map((r) => ({ ...r, baseSalary: Number(r.baseSalary || 0) })),
  });
};

export const createSalaryHistoryEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  const { effectiveFrom, salaryType, baseSalary, reason, notes } = req.body as Record<string, unknown>;
  if (!effectiveFrom || !salaryType || baseSalary === undefined || !reason) {
    res.status(400).json({ error: 'effectiveFrom, salaryType, baseSalary and reason are required' });
    return;
  }
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const id = generateId();
  await execute(
    `INSERT INTO employee_salary_history
     (id, employee_id, effective_from, salary_type, base_salary, reason, notes, changed_by, changed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, req.params.employeeId, effectiveFrom, salaryType, baseSalary, reason, notes || null, req.user.id]
  );

  res.status(201).json({ data: { id } });
};
