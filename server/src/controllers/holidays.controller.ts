import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

export const getHolidays = async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to } = req.query as Record<string, string | undefined>;
  let sql = `SELECT id, date, name, type, scope, created_at as createdAt, updated_at as updatedAt FROM holidays WHERE 1=1`;
  const params: unknown[] = [];
  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY date ASC';

  res.json({ data: await query(sql, params) });
};

export const getHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const row = await queryOne(
    `SELECT id, date, name, type, scope, created_at as createdAt, updated_at as updatedAt
     FROM holidays WHERE id = ?`,
    [req.params.id]
  );
  if (!row) {
    res.status(404).json({ error: 'Holiday not found' });
    return;
  }
  res.json({ data: row });
};

export const createHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, name, type, scope } = req.body as Record<string, string | undefined>;
  if (!date || !name || !type) {
    res.status(400).json({ error: 'date, name and type are required' });
    return;
  }
  const id = generateId();
  await execute(
    `INSERT INTO holidays (id, date, name, type, scope, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, date, name, type, scope || 'GLOBAL']
  );
  res.status(201).json({ data: { id } });
};

export const updateHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await queryOne<{ id: string }>('SELECT id FROM holidays WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Holiday not found' });
    return;
  }
  const { date, name, type, scope } = req.body as Record<string, string | undefined>;
  await execute(
    `UPDATE holidays
     SET date = COALESCE(?, date),
         name = COALESCE(?, name),
         type = COALESCE(?, type),
         scope = COALESCE(?, scope),
         updated_at = NOW()
     WHERE id = ?`,
    [date || null, name || null, type || null, scope || null, req.params.id]
  );
  res.json({ message: 'Holiday updated' });
};

export const deleteHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  await execute('DELETE FROM holidays WHERE id = ?', [req.params.id]);
  res.json({ message: 'Holiday deleted' });
};
