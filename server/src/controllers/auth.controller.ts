import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { execute, generateId, queryOne } from '../utils/db';
import { AuthRequest, UserRole } from '../types';
import { AuditAction, writeAuditLog } from '../utils/auditLog';

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: number;
};

const signToken = (user: { id: string; username: string; full_name: string; role: UserRole }): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.sign(user, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'],
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, password, fullName, role } = req.body as {
    username?: string;
    password?: string;
    fullName?: string;
    role?: UserRole;
  };

  if (!username || !password || !fullName) {
    res.status(400).json({ error: 'username, password and fullName are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' });
    return;
  }

  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    res.status(409).json({ error: 'username already exists' });
    return;
  }

  const id = generateId();
  const hash = await bcrypt.hash(password, 10);
  const userRole = role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.EMPLOYEE;

  await execute(
    `INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())`,
    [id, username, hash, fullName, userRole]
  );

  const token = signToken({ id, username, full_name: fullName, role: userRole });
  res.status(201).json({
    data: {
      token,
      user: { id, username, full_name: fullName, role: userRole },
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const user = await queryOne<UserRow>(
    `SELECT id, username, password_hash, full_name, role, is_active
     FROM users WHERE username = ? LIMIT 1`,
    [username]
  );

  if (!user || !user.is_active) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  });

  await writeAuditLog({
    tableName: 'users',
    action: AuditAction.LOGIN,
    changedBy: user.id,
    recordId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  res.json({
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    },
  });
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({ data: req.user });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    await writeAuditLog({
      tableName: 'users',
      action: AuditAction.LOGOUT,
      changedBy: req.user.id,
      recordId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  }

  res.json({ message: 'Logged out successfully' });
};
