import { execute } from './db';

/**
 * Enum of available audit log actions.
 * Used to categorize audit trail entries for traceability.
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS = 'ACCESS',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RELEASE = 'RELEASE',
}

// PUBLIC_INTERFACE
/**
 * Input shape for writing an audit log entry.
 * `actorRole` captures the role (ADMIN | MANAGER) of the user who performed the action,
 * enabling accurate attribution in the audit trail.
 */
export interface AuditLogInput {
  tableName: string;
  action: AuditAction;
  changedBy?: string;
  recordId?: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
  /** Role of the actor (e.g. 'ADMIN' or 'MANAGER') for attribution */
  actorRole?: string;
}

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
export const writeAuditLog = async ({
  tableName,
  action,
  changedBy,
  recordId,
  previousData,
  newData,
  ipAddress,
  userAgent,
  description,
  actorRole,
}: AuditLogInput): Promise<void> => {
  // Build a description that includes role attribution
  const rolePrefix = actorRole ? `[${actorRole}]` : '';
  const descParts: string[] = [];
  if (rolePrefix) descParts.push(rolePrefix);
  if (description) descParts.push(description);
  if (!description) {
    // Auto-generate a description from action and table
    descParts.push(`${action} on ${tableName}`);
  }
  const fullDescription = descParts.join(' ');

  await execute(
    `INSERT INTO audit_logs
      (id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, description, changed_at)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      tableName,
      action,
      recordId || null,
      changedBy || null,
      previousData ? JSON.stringify(previousData) : null,
      newData ? JSON.stringify(newData) : null,
      ipAddress || null,
      userAgent || null,
      fullDescription || null,
    ]
  );
};
