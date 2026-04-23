import { z } from 'zod';

// ─── Common reusable schemas ─────────────────────────────────────────

/** UUID v4 format string */
const uuidString = z.string().min(1, 'ID is required');

/** Date string in YYYY-MM-DD format */
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/** Optional date string */
const optionalDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional();

/** Month string in YYYY-MM or YYYY-MM-DD format */
const monthString = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Month must be in YYYY-MM or YYYY-MM-DD format');

/** Positive decimal amount */
const positiveAmount = z.number().positive('Amount must be positive');

// ─── Auth Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for user registration */
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().min(1, 'Full name is required').max(150),
  role: z.enum(['ADMIN', 'MANAGER']).optional().default('MANAGER'),
});

// PUBLIC_INTERFACE
/** Validation schema for user login */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Employee Schemas ────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating an employee */
export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.string().email('Invalid email format').max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  departmentId: uuidString,
  roleId: z.string().nullable().optional(),
  hireDate: dateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']).optional().default('DAILY_WAGE'),
  baseSalary: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating an employee */
export const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(150).optional(),
  email: z.string().email('Invalid email format').max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  departmentId: z.string().optional(),
  roleId: z.string().nullable().optional(),
  hireDate: optionalDateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']).optional(),
  baseSalary: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
});

// ─── Department Schemas ──────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating a department */
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).nullable().optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating a department */
export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});

// ─── Role Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating a role */
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(120),
  level: z.string().max(50).nullable().optional(),
  departmentId: uuidString,
  dailyWage: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

// PUBLIC_INTERFACE
/** Validation schema for updating a role */
export const updateRoleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  level: z.string().max(50).nullable().optional(),
  dailyWage: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Attendance Schemas ──────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating/upserting attendance */
export const createAttendanceSchema = z.object({
  employeeId: uuidString,
  date: dateString,
  status: z.enum(['PRESENT', 'ABSENT'], {
    errorMap: () => ({ message: 'Status must be PRESENT or ABSENT' }),
  }),
  notes: z.string().max(1000).nullable().optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating attendance */
export const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT']).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Loan Schemas ────────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating a loan */
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
/** Validation schema for updating a loan */
export const updateLoanSchema = z.object({
  status: z.enum(['ACTIVE', 'PAID', 'CANCELLED']).optional(),
  remainingBalance: z.number().min(0).optional(),
  repaymentMode: z.enum(['MONTHLY', 'DAILY']).optional(),
  dailyRepaymentAmount: z.number().min(0).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for settling a loan */
export const settleLoanSchema = z.object({
  notes: z.string().max(1000).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for extending a loan */
export const extendLoanSchema = z.object({
  numInstallments: z.number().int().min(1).max(60, 'Cannot extend more than 60 installments'),
  installmentAmount: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating a loan installment */
export const updateInstallmentSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
});

// ─── Advance Salary Schemas ─────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating an advance salary */
export const createAdvanceSalarySchema = z.object({
  employeeId: uuidString,
  amount: z.union([z.string().min(1), z.number().positive()]),
  advanceDate: dateString,
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating advance salary status */
export const updateAdvanceSalaryStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, or REJECTED' }),
  }),
});

// ─── Salary Schemas ──────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for salary calculation */
export const calculateSalarySchema = z.object({
  employeeId: uuidString,
  month: monthString,
  bonus: z.number().min(0).optional().default(0),
});

// ─── Holiday Schemas ─────────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating a holiday */
export const createHolidaySchema = z.object({
  date: dateString,
  name: z.string().min(1, 'Holiday name is required').max(255),
  type: z.enum(['PAID', 'UNPAID'], {
    errorMap: () => ({ message: 'Type must be PAID or UNPAID' }),
  }),
  scope: z.enum(['GLOBAL', 'PER_EMPLOYEE']).optional().default('GLOBAL'),
  employeeIds: z.array(z.string().min(1)).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating a holiday */
export const updateHolidaySchema = z.object({
  date: optionalDateString,
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['PAID', 'UNPAID']).optional(),
  scope: z.enum(['GLOBAL', 'PER_EMPLOYEE']).optional(),
  employeeIds: z.array(z.string().min(1)).optional(),
});

// PUBLIC_INTERFACE
/** Validation schema for updating holiday employees */
export const updateHolidayEmployeesSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1, 'At least one employee is required'),
});

// ─── Daily Salary Release Schemas ────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for generating daily releases */
export const generateDailyReleasesSchema = z.object({
  date: dateString,
});

// PUBLIC_INTERFACE
/** Validation schema for bulk releasing daily salaries */
export const releaseAllDailySalariesSchema = z.object({
  date: dateString,
});

// ─── Salary History Schemas ──────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for creating a salary history entry */
export const createSalaryHistorySchema = z.object({
  effectiveFrom: dateString,
  salaryType: z.enum(['FIXED', 'DAILY_WAGE']),
  baseSalary: z.number().min(0),
  reason: z.string().min(1, 'Reason is required').max(1000),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Audit Log Schemas ───────────────────────────────────────────────

// PUBLIC_INTERFACE
/** Validation schema for verifying audit log passkey */
export const verifyPasskeySchema = z.object({
  passkey: z.string().min(1, 'Passkey is required'),
});

// ─── Pagination Query Schema ─────────────────────────────────────────

// PUBLIC_INTERFACE
/** Shared pagination query params schema */
export const paginationQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});
