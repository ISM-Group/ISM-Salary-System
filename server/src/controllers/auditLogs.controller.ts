import { Response } from 'express';
import { query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

/**
 * Verifies the audit log passkey before granting access to audit log data.
 *
 * POST /api/audit-logs/verify
 * Body: { passkey: string }
 * Returns: { data: { verified: boolean } }
 */
// PUBLIC_INTERFACE
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

/**
 * Retrieves audit log entries with optional filtering by table name and action.
 * Supports server-side pagination via ?page=&limit= query parameters.
 *
 * GET /api/audit-logs?tableName=...&action=...&page=...&limit=...
 * @param req - Express request with optional query filters
 * @param res - Express response
 * Returns: { data: AuditLog[], pagination: PaginationMeta }
 */
// PUBLIC_INTERFACE
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tableName, action } = req.query as Record<string, string | undefined>;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const selectFields = `al.id, al.table_name as tableName, al.action, al.record_id as recordId,
           al.changed_by as changedBy, al.changed_at as changedAt, al.ip_address as ipAddress,
           al.user_agent as userAgent, al.description,
           u.username, u.full_name as fullName, u.role as actorRole`;
  const fromClause = `FROM audit_logs al LEFT JOIN users u ON u.id = al.changed_by`;
  let whereClause = 'WHERE 1=1';
  const params: unknown[] = [];

  if (tableName) {
    whereClause += ' AND al.table_name = ?';
    params.push(tableName);
  }
  if (action) {
    whereClause += ' AND al.action = ?';
    params.push(action);
  }

  const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
  const total = Number(countResult?.total || 0);

  const dataSql = `SELECT ${selectFields} ${fromClause} ${whereClause} ORDER BY al.changed_at DESC LIMIT ? OFFSET ?`;
  const rows = await query(dataSql, [...params, pagination.limit, pagination.offset]);

  res.json({
    data: rows,
    pagination: buildPaginationMeta(total, pagination),
  });
};
