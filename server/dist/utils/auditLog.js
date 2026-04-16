"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = exports.AuditAction = void 0;
const db_1 = require("./db");
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["ACCESS"] = "ACCESS";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
const writeAuditLog = async ({ tableName, action, changedBy, recordId, previousData, newData, ipAddress, userAgent, }) => {
    await (0, db_1.execute)(`INSERT INTO audit_logs
      (id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, changed_at)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
        tableName,
        action,
        recordId || null,
        changedBy || null,
        previousData ? JSON.stringify(previousData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
        userAgent || null,
    ]);
};
exports.writeAuditLog = writeAuditLog;
