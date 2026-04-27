import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types';

interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const queryToken = req.query.token as string | undefined;
  const token = headerToken || queryToken;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'JWT secret is not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
