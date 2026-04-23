"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.verifyPasskey = void 0;
const db_1 = require("../utils/db");
/**
 * Verifies the audit log passkey before granting access to audit log data.
 *
 * POST /api/audit-logs/verify
 * Body: { passkey: string }
 * Returns: { data: { verified: boolean } }
 */
// PUBLIC_INTERFACE
const verifyPasskey = async (req, res) => {
    const { passkey } = req.body;
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
exports.verifyPasskey = verifyPasskey;
/**
 * Retrieves audit log entries with optional filtering by table name and action.
 * Returns the description field which includes actor role attribution
 * (e.g. "[ADMIN] Holiday created" or "[MANAGER] Loan created").
 *
 * GET /api/audit-logs?tableName=...&action=...&limit=...
 * @param req - Express request with optional query filters
 * @param res - Express response
 * Returns: { data: AuditLog[] }
 */
// PUBLIC_INTERFACE
const getAuditLogs = async (req, res) => {
    const { tableName, action, limit } = req.query;
    let sql = `
    SELECT al.id, al.table_name as tableName, al.action, al.record_id as recordId,
           al.changed_by as changedBy, al.changed_at as changedAt, al.ip_address as ipAddress,
           al.user_agent as userAgent, al.description,
           u.username, u.full_name as fullName, u.role as actorRole
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.changed_by
    WHERE 1=1
  `;
    const params = [];
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
    res.json({ data: await (0, db_1.query)(sql, params) });
};
exports.getAuditLogs = getAuditLogs;
