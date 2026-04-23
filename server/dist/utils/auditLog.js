"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = exports.AuditAction = void 0;
const db_1 = require("./db");
/**
 * Enum of available audit log actions.
 * Used to categorize audit trail entries for traceability.
 */
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["ACCESS"] = "ACCESS";
    AuditAction["APPROVE"] = "APPROVE";
    AuditAction["REJECT"] = "REJECT";
    AuditAction["RELEASE"] = "RELEASE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
// PUBLIC_INTERFACE
/**
 * Writes a single audit log entry to the audit_logs table.
 * Captures the table affected, the action performed, who performed it,
 * the record ID, before/after data snapshots, request metadata,
 * and an optional human-readable description that includes actor role attribution.
 *
 * When `actorRole` is provided, it is prepended to the description for
 * clear ADMIN vs MANAGER attribution in the audit trail.
 */
const writeAuditLog = async ({ tableName, action, changedBy, recordId, previousData, newData, ipAddress, userAgent, description, actorRole, }) => {
    // Build a description that includes role attribution
    const rolePrefix = actorRole ? `[${actorRole}]` : '';
    const descParts = [];
    if (rolePrefix)
        descParts.push(rolePrefix);
    if (description)
        descParts.push(description);
    if (!description) {
        // Auto-generate a description from action and table
        descParts.push(`${action} on ${tableName}`);
    }
    const fullDescription = descParts.join(' ');
    await (0, db_1.execute)(`INSERT INTO audit_logs
      (id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, description, changed_at)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
        tableName,
        action,
        recordId || null,
        changedBy || null,
        previousData ? JSON.stringify(previousData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
        userAgent || null,
        fullDescription || null,
    ]);
};
exports.writeAuditLog = writeAuditLog;
