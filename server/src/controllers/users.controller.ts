import { Response } from 'express';
import bcrypt from 'bcrypt';
import { execute, query, queryOne } from '../utils/db';
import { AuthRequest, UserRole } from '../types';
import { AuditAction, writeAuditLog } from '../utils/auditLog';

function requireAdmin(req: AuthRequest, res: Response): boolean {
  if (req.user?.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

/** GET /api/users — list all users (ADMIN only) */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await query<any>(
      `SELECT id, username, full_name as fullName, role, is_active as isActive, created_at as createdAt
       FROM users ORDER BY full_name ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/users/:id/reset-password — reset password (ADMIN only) */
export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'newPassword must be at least 8 characters' });
      return;
    }

    const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const hash = await bcrypt.hash(newPassword, 10);
    await execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, req.params.id]);
    await writeAuditLog({ tableName: 'users', action: AuditAction.UPDATE, recordId: req.params.id, changedBy: req.user!.id });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/users/:id/status — activate/deactivate (ADMIN only) */
export const setUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive (boolean) is required' });
      return;
    }

    // Prevent admin from deactivating their own account
    if (req.params.id === req.user!.id && !isActive) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }

    const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    await execute('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, req.params.id]);
    await writeAuditLog({ tableName: 'users', action: AuditAction.UPDATE, recordId: req.params.id, changedBy: req.user!.id });

    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    console.error('setUserStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
