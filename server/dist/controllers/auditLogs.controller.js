"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.verifyPasskey = void 0;
const db_1 = require("../utils/db");
const pagination_1 = require("../utils/pagination");
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
 * Supports server-side pagination via ?page=&limit= query parameters.
 *
 * GET /api/audit-logs?tableName=...&action=...&page=...&limit=...
 * @param req - Express request with optional query filters
 * @param res - Express response
 * Returns: { data: AuditLog[], pagination: PaginationMeta }
 */
// PUBLIC_INTERFACE
const getAuditLogs = async (req, res) => {
    const { tableName, action } = req.query;
    const pagination = (0, pagination_1.parsePagination)(req.query);
    const selectFields = `al.id, al.table_name as tableName, al.action, al.record_id as recordId,
           al.changed_by as changedBy, al.changed_at as changedAt, al.ip_address as ipAddress,
           al.user_agent as userAgent, al.description,
           u.username, u.full_name as fullName, u.role as actorRole`;
    const fromClause = `FROM audit_logs al LEFT JOIN users u ON u.id = al.changed_by`;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (tableName) {
        whereClause += ' AND al.table_name = ?';
        params.push(tableName);
    }
    if (action) {
        whereClause += ' AND al.action = ?';
        params.push(action);
    }
    const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
    const total = Number(countResult?.total || 0);
    const dataSql = `SELECT ${selectFields} ${fromClause} ${whereClause} ORDER BY al.changed_at DESC LIMIT ? OFFSET ?`;
    const rows = await (0, db_1.query)(dataSql, [...params, pagination.limit, pagination.offset]);
    res.json({
        data: rows,
        pagination: (0, pagination_1.buildPaginationMeta)(total, pagination),
    });
};
exports.getAuditLogs = getAuditLogs;
