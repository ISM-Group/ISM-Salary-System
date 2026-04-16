import { execute } from './db';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS = 'ACCESS',
}

interface AuditLogInput {
  tableName: string;
  action: AuditAction;
  changedBy?: string;
  recordId?: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const writeAuditLog = async ({
  tableName,
  action,
  changedBy,
  recordId,
  previousData,
  newData,
  ipAddress,
  userAgent,
}: AuditLogInput): Promise<void> => {
  await execute(
    `INSERT INTO audit_logs
      (id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, changed_at)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      tableName,
      action,
      recordId || null,
      changedBy || null,
      previousData ? JSON.stringify(previousData) : null,
      newData ? JSON.stringify(newData) : null,
      ipAddress || null,
      userAgent || null,
    ]
  );
};
