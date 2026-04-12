import { Request } from 'express';

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
