import { z } from 'zod';

// ─── Common reusable schemas ─────────────────────────────────────────

const uuidString = z.string().min(1, 'ID is required');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const optionalDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional();
const blankToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);
const positiveAmount = z.number().positive('Amount must be positive');

// ─── Auth Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().min(1, 'Full name is required').max(150),
  role: z.enum(['ADMIN', 'MANAGER']).optional().default('MANAGER'),
});

// PUBLIC_INTERFACE
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Employee Schemas ────────────────────────────────────────────────

// PUBLIC_INTERFACE
export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.preprocess(blankToNull, z.string().email('Invalid email format').max(150).nullable().optional()),
  phone: z.preprocess(blankToNull, z.string().max(30).nullable().optional()),
  departmentId: uuidString,
  roleId: z.preprocess(blankToNull, z.string().nullable().optional()),
  hireDate: dateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']).optional().default('DAILY_WAGE'),
  baseSalary: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  addressLine1: z.preprocess(blankToNull, z.string().max(255).nullable().optional()),
  addressLine2: z.preprocess(blankToNull, z.string().max(255).nullable().optional()),
  city: z.preprocess(blankToNull, z.string().max(100).nullable().optional()),
  region: z.preprocess(blankToNull, z.string().max(100).nullable().optional()),
});

// PUBLIC_INTERFACE
export const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(150).optional(),
  email: z.preprocess(blankToNull, z.string().email('Invalid email format').max(150).nullable().optional()),
  phone: z.preprocess(blankToNull, z.string().max(30).nullable().optional()),
  departmentId: z.string().optional(),
  roleId: z.preprocess(blankToNull, z.string().nullable().optional()),
  hireDate: optionalDateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']).optional(),
  baseSalary: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  addressLine1: z.preprocess(blankToNull, z.string().max(255).nullable().optional()),
  addressLine2: z.preprocess(blankToNull, z.string().max(255).nullable().optional()),
  city: z.preprocess(blankToNull, z.string().max(100).nullable().optional()),
  region: z.preprocess(blankToNull, z.string().max(100).nullable().optional()),
});

// ─── Department Schemas ──────────────────────────────────────────────

// PUBLIC_INTERFACE
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).nullable().optional(),
});

// PUBLIC_INTERFACE
export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});

// ─── Role Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(120),
  level: z.string().max(50).nullable().optional(),
  departmentId: uuidString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE', 'ANY']).optional().default('ANY'),
  dailyWage: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

// PUBLIC_INTERFACE
export const updateRoleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  level: z.string().max(50).nullable().optional(),
  salaryType: z.enum(['FIXED', 'DAILY_WAGE', 'ANY']).optional(),
  dailyWage: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Attendance Schemas ──────────────────────────────────────────────

// PUBLIC_INTERFACE
export const createAttendanceSchema = z.object({
  employeeId: uuidString,
  date: dateString,
  status: z.enum(['PRESENT', 'ABSENT'], {
    errorMap: () => ({ message: 'Status must be PRESENT or ABSENT' }),
  }),
  notes: z.string().max(1000).nullable().optional(),
  roleId: z.preprocess(blankToNull, z.string().nullable().optional()),
});

// PUBLIC_INTERFACE
export const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT']).optional(),
  notes: z.string().max(1000).nullable().optional(),
  roleId: z.preprocess(blankToNull, z.string().nullable().optional()),
});

// ─── Loan Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
export const createLoanSchema = z.object({
  employeeId: uuidString,
  loanAmount: positiveAmount,
  status: z.enum(['ACTIVE', 'PAID', 'CANCELLED']).optional().default('ACTIVE'),
  repaymentMode: z.enum(['MONTHLY', 'DAILY']).optional().default('MONTHLY'),
  dailyRepaymentAmount: z.number().min(0).optional().default(0),
  numInstallments: z.number().int().min(1).max(120).optional().default(12),
  startMonth: z.string().optional(),
});

// PUBLIC_INTERFACE
export const updateLoanSchema = z.object({
  status: z.enum(['ACTIVE', 'PAID', 'CANCELLED']).optional(),
  remainingBalance: z.number().min(0).optional(),
  repaymentMode: z.enum(['MONTHLY', 'DAILY']).optional(),
  dailyRepaymentAmount: z.number().min(0).optional(),
});

// PUBLIC_INTERFACE
export const settleLoanSchema = z.object({
  notes: z.string().max(1000).optional(),
});

// PUBLIC_INTERFACE
export const extendLoanSchema = z.object({
  numInstallments: z.number().int().min(1).max(60, 'Cannot extend more than 60 installments'),
  installmentAmount: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

// PUBLIC_INTERFACE
export const updateInstallmentSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
});

// ─── Advance Salary Schemas ─────────────────────────────────────────

// PUBLIC_INTERFACE
export const createAdvanceSalarySchema = z.object({
  employeeId: uuidString,
  amount: z.union([z.string().min(1), z.number().positive()]),
  advanceDate: dateString,
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

// PUBLIC_INTERFACE
export const updateAdvanceSalaryStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, or REJECTED' }),
  }),
});

// ─── Salary Release Schemas ──────────────────────────────────────────

// PUBLIC_INTERFACE
export const previewSalaryReleaseSchema = z.object({
  employeeId: uuidString,
  periodStart: dateString,
  periodEnd: dateString,
  bonus: z.number().min(0).optional().default(0),
});

// PUBLIC_INTERFACE
export const batchPreviewSalaryReleaseSchema = z.object({
  employeeIds: z.array(uuidString).min(1, 'At least one employee is required'),
  periodStart: dateString,
  periodEnd: dateString,
  bonus: z.number().min(0).optional().default(0),
});

// PUBLIC_INTERFACE
export const createSalaryReleaseSchema = z.object({
  employeeId: uuidString,
  periodStart: dateString,
  periodEnd: dateString,
  bonus: z.number().min(0).optional().default(0),
  releasedAmount: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// PUBLIC_INTERFACE
export const batchCreateSalaryReleaseSchema = z.object({
  employeeIds: z.array(uuidString).min(1),
  periodStart: dateString,
  periodEnd: dateString,
  bonus: z.number().min(0).optional().default(0),
  notes: z.string().max(2000).nullable().optional(),
});

// PUBLIC_INTERFACE
export const updateSalaryReleaseSchema = z.object({
  releasedAmount: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ─── Salary History Schemas ──────────────────────────────────────────

// PUBLIC_INTERFACE
export const createSalaryHistorySchema = z.object({
  effectiveFrom: dateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']),
  baseSalary: z.number().min(0),
  reason: z.string().min(1, 'Reason is required').max(1000),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── User Management Schemas ─────────────────────────────────────────

// PUBLIC_INTERFACE
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// PUBLIC_INTERFACE
export const setUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// ─── Audit Log Schemas ───────────────────────────────────────────────

// PUBLIC_INTERFACE
export const verifyPasskeySchema = z.object({
  passkey: z.string().min(1, 'Passkey is required'),
});

// ─── Pagination Query Schema ─────────────────────────────────────────

// PUBLIC_INTERFACE
export const paginationQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});
