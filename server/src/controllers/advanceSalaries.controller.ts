import { Response } from 'express';
import { execute, generateId, query } from '../utils/db';
import { AuthRequest } from '../types';

export const getAdvanceSalaries = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, from, to } = req.query as Record<string, string | undefined>;
  let sql = `
    SELECT a.id, a.employee_id as employeeId, a.amount, a.advance_date as advanceDate, a.slip_photo_url as slipPhotoUrl,
           a.notes, e.full_name as employeeName
    FROM advance_salaries a
    INNER JOIN employees e ON e.id = a.employee_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (employeeId) {
    sql += ' AND a.employee_id = ?';
    params.push(employeeId);
  }
  if (from) {
    sql += ' AND a.advance_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND a.advance_date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY a.advance_date DESC';

  const rows = await query<any>(sql, params);
  res.json({
    data: rows.map((r) => ({ ...r, amount: Number(r.amount || 0) })),
  });
};

export const getEmployeeAdvanceSalaries = async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await query<any>(
    `SELECT id, employee_id as employeeId, amount, advance_date as advanceDate, slip_photo_url as slipPhotoUrl, notes
     FROM advance_salaries
     WHERE employee_id = ?
     ORDER BY advance_date DESC`,
    [req.params.employeeId]
  );
  res.json({ data: rows.map((r) => ({ ...r, amount: Number(r.amount || 0) })) });
};

export const createAdvanceSalary = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, amount, advanceDate, notes } = req.body as Record<string, string | undefined>;
  if (!employeeId || !amount || !advanceDate) {
    res.status(400).json({ error: 'employeeId, amount and advanceDate are required' });
    return;
  }

  const id = generateId();
  const slipPhotoUrl = req.file ? `uploads/${id}-${req.file.originalname}` : null;

  await execute(
    `INSERT INTO advance_salaries
     (id, employee_id, amount, advance_date, slip_photo_url, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, employeeId, amount, advanceDate, slipPhotoUrl, notes || null]
  );

  res.status(201).json({ data: { id, slipPhotoUrl } });
};
