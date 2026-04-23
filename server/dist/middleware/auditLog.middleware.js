"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
/**
 * Express middleware factory that creates an audit log entry for a given
 * table and action. Automatically captures the actor's role (ADMIN vs MANAGER)
 * from the authenticated request for proper attribution.
 *
 * For UPDATE actions, fetches the previous state of the record before
 * the request handler executes. Logs are written asynchronously after
 * the response finishes, and only for successful (2xx/3xx) responses.
 *
 * @param tableName - Database table being modified
 * @param action - The audit action type (CREATE, UPDATE, DELETE, etc.)
 * @returns Express middleware function
 */
// PUBLIC_INTERFACE
const auditLog = (tableName, action) => async (req, res, next) => {
    const recordId = req.params.id || req.body?.id || undefined;
    const previousData = recordId && action === auditLog_1.AuditAction.UPDATE
        ? await (0, db_1.queryOne)(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId])
        : null;
    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 400) {
            return;
        }
        // Extract actor role for attribution (ADMIN vs MANAGER)
        const actorRole = req.user?.role || undefined;
        (0, auditLog_1.writeAuditLog)({
            tableName,
            action,
            changedBy: req.user?.id,
            actorRole,
            recordId,
            previousData: previousData || undefined,
            newData: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            description: `${action} on ${tableName}${recordId ? ` (record: ${recordId})` : ''}`,
        }).catch((error) => {
            console.error('Audit log write failed:', error);
        });
    });
    next();
};
exports.auditLog = auditLog;
