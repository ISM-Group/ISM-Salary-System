"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = exports.verifyPasskeySchema = exports.createSalaryHistorySchema = exports.releaseAllDailySalariesSchema = exports.generateDailyReleasesSchema = exports.updateHolidayEmployeesSchema = exports.updateHolidaySchema = exports.createHolidaySchema = exports.calculateSalarySchema = exports.updateAdvanceSalaryStatusSchema = exports.createAdvanceSalarySchema = exports.updateInstallmentSchema = exports.extendLoanSchema = exports.settleLoanSchema = exports.updateLoanSchema = exports.createLoanSchema = exports.updateAttendanceSchema = exports.createAttendanceSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.updateDepartmentSchema = exports.createDepartmentSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ─── Common reusable schemas ─────────────────────────────────────────
/** UUID v4 format string */
const uuidString = zod_1.z.string().min(1, 'ID is required');
/** Date string in YYYY-MM-DD format */
const dateString = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
/** Optional date string */
const optionalDateString = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional();
/** Month string in YYYY-MM or YYYY-MM-DD format */
const monthString = zod_1.z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Month must be in YYYY-MM or YYYY-MM-DD format');
/** Positive decimal amount */
const positiveAmount = zod_1.z.number().positive('Amount must be positive');
// ─── Auth Schemas ────────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for user registration */
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(100),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128),
    fullName: zod_1.z.string().min(1, 'Full name is required').max(150),
    role: zod_1.z.enum(['ADMIN', 'MANAGER']).optional().default('MANAGER'),
});
// PUBLIC_INTERFACE
/** Validation schema for user login */
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ─── Employee Schemas ────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating an employee */
exports.createEmployeeSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(1, 'Employee ID is required').max(50),
    fullName: zod_1.z.string().min(1, 'Full name is required').max(150),
    email: zod_1.z.string().email('Invalid email format').max(150).nullable().optional(),
    phone: zod_1.z.string().max(30).nullable().optional(),
    departmentId: uuidString,
    roleId: zod_1.z.string().nullable().optional(),
    hireDate: dateString,
    salaryType: zod_1.z.enum(['FIXED', 'DAILY_WAGE']).optional().default('DAILY_WAGE'),
    baseSalary: zod_1.z.number().min(0).nullable().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    addressLine1: zod_1.z.string().max(255).nullable().optional(),
    addressLine2: zod_1.z.string().max(255).nullable().optional(),
    city: zod_1.z.string().max(100).nullable().optional(),
    region: zod_1.z.string().max(100).nullable().optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating an employee */
exports.updateEmployeeSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(1).max(50).optional(),
    fullName: zod_1.z.string().min(1).max(150).optional(),
    email: zod_1.z.string().email('Invalid email format').max(150).nullable().optional(),
    phone: zod_1.z.string().max(30).nullable().optional(),
    departmentId: zod_1.z.string().optional(),
    roleId: zod_1.z.string().nullable().optional(),
    hireDate: optionalDateString,
    salaryType: zod_1.z.enum(['FIXED', 'DAILY_WAGE']).optional(),
    baseSalary: zod_1.z.number().min(0).nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    addressLine1: zod_1.z.string().max(255).nullable().optional(),
    addressLine2: zod_1.z.string().max(255).nullable().optional(),
    city: zod_1.z.string().max(100).nullable().optional(),
    region: zod_1.z.string().max(100).nullable().optional(),
});
// ─── Department Schemas ──────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating a department */
exports.createDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100),
    description: zod_1.z.string().max(1000).nullable().optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating a department */
exports.updateDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(1000).nullable().optional(),
});
// ─── Role Schemas ────────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating a role */
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Role name is required').max(120),
    level: zod_1.z.string().max(50).nullable().optional(),
    departmentId: uuidString,
    dailyWage: zod_1.z.number().min(0).nullable().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
// PUBLIC_INTERFACE
/** Validation schema for updating a role */
exports.updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120).optional(),
    level: zod_1.z.string().max(50).nullable().optional(),
    dailyWage: zod_1.z.number().min(0).nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// ─── Attendance Schemas ──────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating/upserting attendance */
exports.createAttendanceSchema = zod_1.z.object({
    employeeId: uuidString,
    date: dateString,
    status: zod_1.z.enum(['PRESENT', 'ABSENT'], {
        errorMap: () => ({ message: 'Status must be PRESENT or ABSENT' }),
    }),
    notes: zod_1.z.string().max(1000).nullable().optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating attendance */
exports.updateAttendanceSchema = zod_1.z.object({
    status: zod_1.z.enum(['PRESENT', 'ABSENT']).optional(),
    notes: zod_1.z.string().max(1000).nullable().optional(),
});
// ─── Loan Schemas ────────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating a loan */
exports.createLoanSchema = zod_1.z.object({
    employeeId: uuidString,
    loanAmount: positiveAmount,
    status: zod_1.z.enum(['ACTIVE', 'PAID', 'CANCELLED']).optional().default('ACTIVE'),
    repaymentMode: zod_1.z.enum(['MONTHLY', 'DAILY']).optional().default('MONTHLY'),
    dailyRepaymentAmount: zod_1.z.number().min(0).optional().default(0),
    numInstallments: zod_1.z.number().int().min(1).max(120).optional().default(12),
    startMonth: zod_1.z.string().optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating a loan */
exports.updateLoanSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'PAID', 'CANCELLED']).optional(),
    remainingBalance: zod_1.z.number().min(0).optional(),
    repaymentMode: zod_1.z.enum(['MONTHLY', 'DAILY']).optional(),
    dailyRepaymentAmount: zod_1.z.number().min(0).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for settling a loan */
exports.settleLoanSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for extending a loan */
exports.extendLoanSchema = zod_1.z.object({
    numInstallments: zod_1.z.number().int().min(1).max(60, 'Cannot extend more than 60 installments'),
    installmentAmount: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().max(1000).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating a loan installment */
exports.updateInstallmentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    status: zod_1.z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
});
// ─── Advance Salary Schemas ─────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating an advance salary */
exports.createAdvanceSalarySchema = zod_1.z.object({
    employeeId: uuidString,
    amount: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.number().positive()]),
    advanceDate: dateString,
    notes: zod_1.z.string().max(1000).nullable().optional(),
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating advance salary status */
exports.updateAdvanceSalaryStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
        errorMap: () => ({ message: 'Status must be PENDING, APPROVED, or REJECTED' }),
    }),
});
// ─── Salary Schemas ──────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for salary calculation */
exports.calculateSalarySchema = zod_1.z.object({
    employeeId: uuidString,
    month: monthString,
    bonus: zod_1.z.number().min(0).optional().default(0),
});
// ─── Holiday Schemas ─────────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating a holiday */
exports.createHolidaySchema = zod_1.z.object({
    date: dateString,
    name: zod_1.z.string().min(1, 'Holiday name is required').max(255),
    type: zod_1.z.enum(['PAID', 'UNPAID'], {
        errorMap: () => ({ message: 'Type must be PAID or UNPAID' }),
    }),
    scope: zod_1.z.enum(['GLOBAL', 'PER_EMPLOYEE']).optional().default('GLOBAL'),
    employeeIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating a holiday */
exports.updateHolidaySchema = zod_1.z.object({
    date: optionalDateString,
    name: zod_1.z.string().min(1).max(255).optional(),
    type: zod_1.z.enum(['PAID', 'UNPAID']).optional(),
    scope: zod_1.z.enum(['GLOBAL', 'PER_EMPLOYEE']).optional(),
    employeeIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
// PUBLIC_INTERFACE
/** Validation schema for updating holiday employees */
exports.updateHolidayEmployeesSchema = zod_1.z.object({
    employeeIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one employee is required'),
});
// ─── Daily Salary Release Schemas ────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for generating daily releases */
exports.generateDailyReleasesSchema = zod_1.z.object({
    date: dateString,
});
// PUBLIC_INTERFACE
/** Validation schema for bulk releasing daily salaries */
exports.releaseAllDailySalariesSchema = zod_1.z.object({
    date: dateString,
});
// ─── Salary History Schemas ──────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for creating a salary history entry */
exports.createSalaryHistorySchema = zod_1.z.object({
    effectiveFrom: dateString,
    salaryType: zod_1.z.enum(['FIXED', 'DAILY_WAGE']),
    baseSalary: zod_1.z.number().min(0),
    reason: zod_1.z.string().min(1, 'Reason is required').max(1000),
    notes: zod_1.z.string().max(1000).nullable().optional(),
});
// ─── Audit Log Schemas ───────────────────────────────────────────────
// PUBLIC_INTERFACE
/** Validation schema for verifying audit log passkey */
exports.verifyPasskeySchema = zod_1.z.object({
    passkey: zod_1.z.string().min(1, 'Passkey is required'),
});
// ─── Pagination Query Schema ─────────────────────────────────────────
// PUBLIC_INTERFACE
/** Shared pagination query params schema */
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('50'),
});
