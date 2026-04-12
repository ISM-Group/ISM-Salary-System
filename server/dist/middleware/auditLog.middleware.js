"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
const auditLog = (tableName, action) => async (req, res, next) => {
    const recordId = req.params.id || req.body?.id || undefined;
    const previousData = recordId && action === auditLog_1.AuditAction.UPDATE
        ? await (0, db_1.queryOne)(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId])
        : null;
    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 400) {
            return;
        }
        (0, auditLog_1.writeAuditLog)({
            tableName,
            action,
            changedBy: req.user?.id,
            recordId,
            previousData: previousData || undefined,
            newData: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
        }).catch((error) => {
            console.error('Audit log write failed:', error);
        });
    });
    next();
};
exports.auditLog = auditLog;
