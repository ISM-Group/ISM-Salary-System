import { Request } from 'express';

/**
 * UserRole defines the two system-level roles for the ISM Salary System.
 * - ADMIN: Full access — can approve, edit, delete, and view audit logs.
 * - MANAGER: Data-entry access — can create records, view data, but cannot
 *   approve, release, edit/delete employees, or view audit logs.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

// PUBLIC_INTERFACE
/**
 * Represents the authenticated user attached to the request by the auth middleware.
 */
export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

// PUBLIC_INTERFACE
/**
 * Extended Express Request that includes the authenticated user.
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
  body: any;
  query: any;
  params: any;
  headers: any;
  file?: any;
}
