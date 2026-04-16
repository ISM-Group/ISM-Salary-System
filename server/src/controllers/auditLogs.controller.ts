import { Response } from 'express';
import { query } from '../utils/db';
import { AuthRequest } from '../types';

export const verifyPasskey = async (req: AuthRequest, res: Response): Promise<void> => {
  const { passkey } = req.body as { passkey?: string };
  if (!passkey) {
    res.status(400).json({ error: 'passkey is required' });
    return;
  }

  const expected = process.env.AUDIT_LOG_PASSKEY;
  if (!expected) {
    res.status(500).json({ error: 'Audit passkey is not configured' });
    return;
  }

  if (passkey !== expected) {
    res.status(401).json({ error: 'invalid passkey' });
    return;
  }

  res.json({ data: { verified: true } });
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tableName, action, limit } = req.query as Record<string, string | undefined>;
  let sql = `
    SELECT al.id, al.table_name as tableName, al.action, al.record_id as recordId,
           al.changed_by as changedBy, al.changed_at as changedAt, al.ip_address as ipAddress,
           al.user_agent as userAgent, u.username, u.full_name as fullName
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.changed_by
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (tableName) {
    sql += ' AND al.table_name = ?';
    params.push(tableName);
  }
  if (action) {
    sql += ' AND al.action = ?';
    params.push(action);
  }
  sql += ' ORDER BY al.changed_at DESC LIMIT ?';
  params.push(Number(limit || 100));

  res.json({ data: await query(sql, params) });
};
