import { NextFunction, Response } from 'express';
import { queryOne } from '../utils/db';
import { AuditAction, writeAuditLog } from '../utils/auditLog';
import { AuthRequest } from '../types';

export const auditLog =
  (tableName: string, action: AuditAction) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const recordId = req.params.id || req.body?.id || undefined;
    const previousData =
      recordId && action === AuditAction.UPDATE
        ? await queryOne<Record<string, unknown>>(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId])
        : null;

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 400) {
        return;
      }

      writeAuditLog({
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
