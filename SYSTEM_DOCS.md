# ISM Salary System — Complete System Documentation

**Last updated:** 2026-04-28  
**Status:** Active development — DB migration 015 pending execution  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Business Logic Rules](#5-business-logic-rules)
6. [Server — API Reference](#6-server--api-reference)
7. [Server — Controllers](#7-server--controllers)
8. [Server — Middleware](#8-server--middleware)
9. [Client — Pages & Routes](#9-client--pages--routes)
10. [Client — API Layer](#10-client--api-layer)
11. [Client — Design System & Theme](#11-client--design-system--theme)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Pending Actions](#13-pending-actions)

---

## 1. Project Overview

ISM Salary System is an internal HR/payroll management system for ISM Group. It handles:

- Employee records, departments, and roles
- Daily attendance marking with role rotation support
- Two salary types: **FIXED** (monthly) and **DAILY_WAGE** (per-present-day)
- Unified salary releases (replaces old fragmented payroll tables)
- Loan management with installment scheduling
- Advance salary requests and approvals
- Salary increment history tracking
- Export of payroll reports and payslips
- Admin-level user management
- Full audit logging of all write operations

All users route through `/admin/*`. There is no employee self-service portal.

---

## 2. Tech Stack

### Server
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | MySQL 8+ (InnoDB, utf8mb4) |
| Auth | JWT (jsonwebtoken) — Bearer header or `?token=` query param |
| Validation | Zod schemas via `validate.middleware.ts` |
| Password hashing | bcrypt (salt rounds: 10) |
| Security | helmet, express-rate-limit, CORS whitelist |
| Logging | morgan |
| File storage | Local `/uploads` for legacy slips; Contabo S3-compatible object storage for employee photos via `fileStorage.ts` |

### Client
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 (JIT) + shadcn/ui |
| State management | TanStack React Query v5 |
| Routing | React Router v6 |
| HTTP client | Axios (with interceptors) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Font | Plus Jakarta Sans (Google Fonts) |
| Charts | Recharts |

---

## 3. Repository Structure

```
ISM-Salary-System/
├── server/
│   └── src/
│       ├── app.ts                        # Express app setup, middleware, route mounts
│       ├── server.ts                     # HTTP server entry point
│       ├── types/index.ts                # AuthRequest, AuthUser, UserRole types
│       ├── controllers/
│       │   ├── auth.controller.ts        # login, register, me
│       │   ├── attendance.controller.ts  # getAttendance, getDailyAttendance, create, update
│       │   ├── dashboard.controller.ts   # getStats, getSalaryTrends, getDeptDistribution, etc.
│       │   ├── departments.controller.ts # CRUD departments
│       │   ├── employees.controller.ts   # CRUD employees
│       │   ├── exports.controller.ts     # exportPayroll (CSV), generatePayslip (PDF)
│       │   ├── loans.controller.ts       # CRUD loans, installments, extendLoan
│       │   ├── advanceSalaries.controller.ts # CRUD advance requests, approve/reject
│       │   ├── salaryHistory.controller.ts   # employee_salary_history increments
│       │   ├── salaryReleases.controller.ts  # unified payroll — preview, create, release
│       │   ├── users.controller.ts       # admin user management
│       │   ├── roles.controller.ts       # CRUD roles
│       │   └── auditLogs.controller.ts   # read audit_logs
│       ├── middleware/
│       │   ├── auth.middleware.ts        # JWT verification (Bearer + ?token= fallback)
│       │   ├── rbac.middleware.ts        # role-based access control
│       │   ├── validate.middleware.ts    # Zod schema validation
│       │   └── auditLog.middleware.ts    # auto audit logging on mutations
│       ├── routes/                       # one file per resource
│       ├── utils/
│       │   ├── db.ts                     # query(), queryOne(), execute(), generateId()
│       │   ├── auditLog.ts               # writeAuditLog(), AuditAction enum
│       │   ├── fileStorage.ts            # multer upload config
│       │   └── pagination.ts            # pagination helpers
│       ├── validation/schemas.ts         # all Zod schemas
│       └── database/
│           ├── setup/                    # initial schema + seed SQL files
│           └── migrations/
│               ├── 006–014_*.sql         # historical migrations (already run)
│               └── 015_salary_releases_overhaul.sql  # ⚠️ PENDING EXECUTION
├── client/
│   └── src/
│       ├── App.tsx                       # route declarations
│       ├── main.tsx                      # React root with ThemeProvider
│       ├── index.css                     # Tailwind + CSS variables (light + dark)
│       ├── contexts/
│       │   ├── AuthContext.tsx           # JWT auth state, login/logout
│       │   └── ThemeContext.tsx          # dark/light mode with localStorage persistence
│       ├── components/
│       │   ├── layout/
│       │   │   ├── MainLayout.tsx        # sidebar + header shell
│       │   │   ├── Sidebar.tsx           # nav links + dark mode toggle
│       │   │   └── Header.tsx            # page title + mobile nav + dark mode toggle
│       │   ├── dashboard/
│       │   │   └── StatCard.tsx          # animated KPI card
│       │   └── ui/                       # shadcn/ui primitives
│       ├── pages/
│       │   ├── auth/LoginPage.tsx
│       │   └── admin/
│       │       ├── AdminDashboardPage.tsx
│       │       ├── AttendanceEntryPage.tsx     # inline dropdown per-row, real-time save
│       │       ├── EmployeesPage.tsx
│       │       ├── EmployeeProfilePage.tsx     # 6-tab decision portal
│       │       ├── EmployeeFormPage.tsx
│       │       ├── EmployeeAttendanceCalendarPage.tsx
│       │       ├── DepartmentsPage.tsx
│       │       ├── RolesPage.tsx
│       │       ├── LoansPage.tsx
│       │       ├── AdvanceSalariesPage.tsx
│       │       ├── SalaryReleasesPage.tsx      # 3-step wizard + release list
│       │       ├── UserManagementPage.tsx      # admin-only user table
│       │       ├── ReportsPage.tsx
│       │       └── AuditLogsPage.tsx
│       ├── hooks/
│       │   ├── use-toast.ts
│       │   └── use-mobile.ts
│       └── lib/
│           ├── api.ts                    # all Axios API calls grouped by resource
│           ├── utils.ts                  # cn(), formatCurrency()
│           └── formValidation.ts         # isIsoDate(), etc.
```

---

## 4. Database Schema

### Core Tables (in dependency order)

#### `users`
```sql
id CHAR(36) PK, username UNIQUE, full_name, password_hash,
role ENUM('ADMIN','MANAGER'), is_active BOOL, created_at, updated_at
```

#### `departments`
```sql
id CHAR(36) PK, name, description, created_at, updated_at
```

#### `roles`
```sql
id CHAR(36) PK, name, department_id FK→departments, daily_wage DECIMAL(12,2),
description, created_at, updated_at
```

#### `employees`
```sql
id CHAR(36) PK, employee_id VARCHAR(50) UNIQUE,
full_name, email, phone,
department_id FK→departments, role_id FK→roles,
salary_type ENUM('FIXED','DAILY_WAGE'),
base_salary DECIMAL(12,2),   -- monthly for FIXED; daily fallback for DAILY_WAGE
hire_date DATE, is_active BOOL,
address_line1, address_line2, city, region,
photo_url VARCHAR(500), photo_key VARCHAR(500), -- employee photo object URL/key
user_id FK→users NULL,       -- employee↔login user mapping (migration 014)
created_at, updated_at
```

#### `employee_salary_history`
```sql
id CHAR(36) PK, employee_id FK→employees,
salary_type ENUM('FIXED','DAILY_WAGE'),
base_salary DECIMAL(12,2),   -- the new rate (absolute, not delta)
effective_from DATE,
reason VARCHAR(500), notes TEXT,
changed_by FK→users,
created_at
```

#### `attendance`
```sql
id CHAR(36) PK, employee_id FK→employees,
role_id CHAR(36) NULL FK→roles ON DELETE SET NULL,  -- ← added by migration 015
date DATE, status ENUM('PRESENT','ABSENT'),
notes TEXT, created_at, updated_at
UNIQUE KEY (employee_id, date)
```

#### `loans`
```sql
id CHAR(36) PK, employee_id FK→employees,
loan_amount DECIMAL(12,2), remaining_balance DECIMAL(12,2),
repayment_type ENUM('DAILY','MONTHLY'),
daily_repayment_amount DECIMAL(12,2) NULL,   -- used when DAILY
installment_count INT NULL,                   -- used when MONTHLY
status ENUM('ACTIVE','PAID','CANCELLED'),
start_date DATE, notes TEXT,
created_at, updated_at
```

#### `loan_installments`
```sql
id CHAR(36) PK, loan_id FK→loans,
installment_number INT,
due_month DATE,              -- first day of the month the installment is due
amount DECIMAL(12,2),
status ENUM('PENDING','PAID'),
paid_at TIMESTAMP NULL,
created_at
```

#### `advance_salaries`
```sql
id CHAR(36) PK, employee_id FK→employees,
amount DECIMAL(12,2), advance_date DATE,
reason TEXT, status ENUM('PENDING','APPROVED','REJECTED'),
approved_by FK→users NULL,
created_at, updated_at
```

#### `salary_releases`  ← **NEW — requires migration 015**
```sql
id CHAR(36) PK,
employee_id FK→employees ON DELETE CASCADE,
period_start DATE, period_end DATE,
release_type ENUM('DAILY','WEEKLY','MONTHLY','CUSTOM') DEFAULT 'CUSTOM',
salary_type ENUM('FIXED','DAILY_WAGE'),
working_days INT DEFAULT 0,
gross_amount DECIMAL(12,2) DEFAULT 0,
absent_deduction DECIMAL(12,2) DEFAULT 0,
advance_deductions DECIMAL(12,2) DEFAULT 0,
loan_deductions DECIMAL(12,2) DEFAULT 0,
bonus DECIMAL(12,2) DEFAULT 0,
calculated_net DECIMAL(12,2) DEFAULT 0,
released_amount DECIMAL(12,2) DEFAULT 0,  -- what admin actually hands out
status ENUM('DRAFT','RELEASED') DEFAULT 'DRAFT',
released_by FK→users NULL ON DELETE SET NULL,
notes TEXT,
created_at, updated_at
UNIQUE KEY (employee_id, period_start, period_end)
```

#### `audit_logs`
```sql
id CHAR(36) PK, table_name, action ENUM('CREATE','UPDATE','DELETE','RELEASE'),
record_id CHAR(36), changed_by FK→users,
old_values JSON NULL, new_values JSON NULL,
description TEXT NULL,
changed_at TIMESTAMP
```

### Dropped Tables (migration 015 removes these)
- `salary_calculations` — old fixed-salary monthly table
- `daily_salary_releases` — old per-day DAILY_WAGE releases
- `holidays` — business does not use the holidays feature
- `holiday_employees` — FK child of holidays

---

## 5. Business Logic Rules

### Effective Personal Rate
`getEffectiveRate(employeeId)` is the authoritative source of truth for a salary calculation:
1. Query `employee_salary_history` WHERE `employee_id = ?` AND `salary_type = employee.salary_type` ORDER BY `effective_from DESC LIMIT 1`
2. If a record exists → `personalRate = history.base_salary`
3. If no history → `personalRate = employees.base_salary ?? roles.daily_wage ?? 0`

### DAILY_WAGE Salary Release Calculation
- For every **PRESENT** attendance record in the period:
  - `effectiveRate = MAX(personalRate, attendance.role.daily_wage)`
  - If `attendance.role_id` is NULL → `roleDailyWage = 0` → `effectiveRate = personalRate`
- `gross_amount = SUM(effectiveRate for all PRESENT days)`
- `working_days = COUNT(PRESENT records in period)`
- `advance_deductions = SUM(approved advance_salaries.amount WHERE advance_date BETWEEN period)`
- **Loan deductions — DAILY repayment loans:** `SUM(daily_repayment_amount) × working_days`
- **Loan deductions — MONTHLY repayment loans:** only when `release_type = 'MONTHLY'`; deducts PENDING installments whose `due_month` falls within the period
- `calculated_net = gross - advance_deductions - loan_deductions + bonus`
- `released_amount` is editable by admin (defaults to `calculated_net`; can be less for partial payout)

### FIXED Salary Release Calculation
- Always `release_type = 'MONTHLY'` (period = first day → last day of a calendar month)
- `baseSalary = getEffectiveRate(employeeId).personalRate`
- `absent_days = COUNT(ABSENT attendance records in period)`
- **4 paid-offs rule:** `paidOffs = MIN(4, absent_days)` — first 4 absences are always paid, no carry-over
- `excess_absent = MAX(0, absent_days - 4)`
- `absent_deduction = excess_absent × (baseSalary / 30)` — always divided by 30 regardless of actual month length
- `gross_amount = baseSalary`
- `calculated_net = gross - absent_deduction - advance_deductions - loan_deductions + bonus`

### Release Action (DRAFT → RELEASED)
When an admin releases a salary record:
1. Status updated to `RELEASED`, `released_by = req.user.id`
2. **DAILY repayment loans:** `remaining_balance -= loan_deduction_amount`; if `remaining_balance ≤ 0` → `status = 'PAID'`
3. **MONTHLY repayment loans:** PENDING installments whose `due_month` is within the release period → marked `status = 'PAID'`, `paid_at = NOW()`
4. Audit log written with `AuditAction.RELEASE`

### Release Type Detection (auto)
- `detectReleaseType(from, to)`:
  - Same day → `DAILY`
  - Exactly 7 days → `WEEKLY`
  - `from` = first of month AND `to` = last of month → `MONTHLY`
  - Otherwise → `CUSTOM`

### Loan extendLoan Bug Fix
Two separate queries instead of one combined aggregate (prevents MySQL ambiguity bug):
```sql
-- Step 1
SELECT MAX(installment_number) AS maxNum FROM loan_installments WHERE loan_id = ?
-- Step 2
SELECT due_month FROM loan_installments WHERE loan_id = ? AND installment_number = <maxNum>
```

---

## 6. Server — API Reference

### Base URL
`/api` — all routes require `Authorization: Bearer <token>` except `/api/auth/login`

**Auth also accepts `?token=<jwt>` query parameter** — used by export/payslip URLs opened directly in browser.

### Rate Limiting
- `/api/auth/*` — 20 requests / 15 min
- All other routes — 300 requests / 15 min

---

### Auth `/api/auth`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Login → returns `{ token, user }` |
| POST | `/register` | ADMIN | Create new user account |
| GET | `/me` | Any | Current user info |
| POST | `/logout` | Any | Clear session |

### Departments `/api/departments`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all departments |
| POST | `/` | Create department |
| PUT | `/:id` | Update department |
| DELETE | `/:id` | Delete department |

### Roles `/api/roles`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all roles (optional `?departmentId=`) |
| GET | `/department/:id` | Roles scoped to a department |
| POST | `/` | Create role |
| PUT | `/:id` | Update role |
| DELETE | `/:id` | Delete role |

### Employees `/api/employees`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List employees (`?isActive`, `?departmentId`, `?search`, `?page`, `?limit`) |
| GET | `/:id` | Get single employee (includes roleId, roleName, departmentId, salaryType, baseSalary) |
| GET | `/:id/photo` | Redirect to readable employee photo URL from Contabo storage |
| POST | `/` | Create employee; `employeeId` is autogenerated; accepts multipart `photo` |
| PUT | `/:id` | Update employee; accepts multipart `photo` |
| DELETE | `/:id` | Deactivate employee |

### Attendance `/api/attendance`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List attendance records (`?employeeId`, `?from`, `?to`, `?status`) |
| GET | `/daily` | All records for a single date `?date=YYYY-MM-DD` (includes `roleId`, `roleName`) |
| POST | `/` | Create/upsert attendance record (body: `{ employeeId, date, status, roleId?, notes? }`) — if `roleId` omitted, defaults to employee's `role_id` |
| PUT | `/:id` | Update attendance record (accepts `roleId` update) |
| DELETE | `/:id` | Delete record |

### Loans `/api/loans`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List loans (`?employeeId`, `?status`) |
| GET | `/:id` | Loan + installments |
| POST | `/` | Create loan |
| PUT | `/:id` | Update loan |
| PUT | `/:id/extend` | Add installments (two-query fix for `lastDueMonth`) |
| DELETE | `/:id` | Cancel loan |

### Advance Salaries `/api/advance-salaries`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List advances (`?employeeId`, `?status`, `?from`, `?to`) |
| POST | `/` | Create advance request |
| PUT | `/:id/approve` | Approve advance |
| PUT | `/:id/reject` | Reject advance |
| DELETE | `/:id` | Delete advance |

### Salary History `/api/salary-history`
| Method | Path | Description |
|---|---|---|
| GET | `/:employeeId` | All history entries for an employee |
| POST | `/` | Add increment/change record |
| DELETE | `/:id` | Remove history entry |

### Salary Releases `/api/salary-releases`
| Method | Path | Description |
|---|---|---|
| POST | `/preview` | Preview single release (returns day breakdown + deductions, no DB write) |
| POST | `/batch-preview` | Preview multiple employees at once |
| POST | `/` | Create DRAFT release |
| POST | `/batch` | Create DRAFT releases for multiple employees |
| GET | `/` | List releases (`?employeeId`, `?from`, `?to`, `?status`, `?departmentId`, `?page`) |
| GET | `/:id` | Single release (includes day breakdown for DAILY_WAGE) |
| GET | `/employee/:id` | All releases for an employee |
| GET | `/employee/:id/calendar` | Month calendar view (`?month=YYYY-MM` → attendance days + releases) |
| PUT | `/:id` | Update DRAFT (notes, released_amount, bonus) |
| PUT | `/:id/release` | DRAFT → RELEASED (triggers loan balance updates) |
| PUT | `/batch-release` | Release multiple (body: `{ ids[] }` or `{ from, to }`) |
| DELETE | `/:id` | Delete DRAFT only |

### Users `/api/users`  *(ADMIN only)*
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all users (id, username, fullName, role, isActive) |
| PUT | `/:id/reset-password` | Reset password (body: `{ newPassword: string min 8 }`) |
| PUT | `/:id/status` | Activate/deactivate (body: `{ isActive: bool }`) — cannot deactivate own account |

### Dashboard `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | KPI summary (totalEmployees, activeLoans, pendingAdvances, monthlySalary) |
| GET | `/salary-trends` | Monthly salary trend (`?months=6`) |
| GET | `/department-distribution` | Headcount by department |
| GET | `/attendance-stats` | Present/Absent counts by month |
| GET | `/loan-breakdown` | Loan status breakdown |
| GET | `/recent-activity` | Recent audit log entries |

**Note:** `monthlySalary` and `salary-trends` queries gracefully return `0` / empty array if `salary_releases` table doesn't exist yet (migration 015 not run).

### Exports `/api/exports`
| Method | Path | Description |
|---|---|---|
| GET | `/payroll` | CSV payroll export (`?from`, `?to`, `?departmentId`) — queries `salary_releases` |
| GET | `/payslip/:employeeId` | PDF payslip (`?month=YYYY-MM`) — uses `salary_releases` |

---

## 7. Server — Controllers

### `salaryReleases.controller.ts`
Key internal helpers:

**`getEffectiveRate(employeeId)`**
- Returns `{ salaryType, personalRate, baseSalary }`
- Checks `employee_salary_history` first; falls back to `employees.base_salary` / `roles.daily_wage`

**`buildDailyWagePreview(employeeId, from, to, personalRate)`**
- JOINs attendance + roles for each record in period
- `effectiveRate = MAX(personalRate, role.daily_wage)` per PRESENT day
- Returns `{ dayBreakdown[], workingDays, grossAmount, averageDailyRate }`

**`buildFixedPreview(employeeId, from, to, baseSalary)`**
- Counts ABSENT and PRESENT records
- Applies 4 paid-off rule, calculates `absentDeduction = excessAbsent × (baseSalary / 30)`
- Returns `{ baseSalary, absentDays, paidOffs, excessAbsent, absentDeduction, grossAmount, workingDays }`

**`calculateLoanDeductions(employeeId, from, to, workingDays, isMonthlyPeriod)`**
- DAILY loans: `SUM(daily_repayment_amount) × workingDays` for all ACTIVE daily loans
- MONTHLY loans: only if `isMonthlyPeriod = true`; sums PENDING installments due in period

**`detectReleaseType(from, to)`**
- Returns `'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'`

**`releasePayment` handler**
- Validates DRAFT status
- Decrements DAILY loan `remaining_balance`, marks loan PAID if ≤ 0
- Marks MONTHLY installments PAID where `due_month` is within release period
- Updates status to RELEASED, sets `released_by`
- Writes audit log with `AuditAction.RELEASE`

### `attendance.controller.ts`
- `getAttendance` / `getDailyAttendance`: JOIN roles, return `roleId`, `roleName`
- `createAttendance`: body accepts `roleId`; if omitted, auto-resolves from `employees.role_id`; UPSERT pattern (UPDATE existing or INSERT new)
- `updateAttendance`: accepts `roleId` in body

### `dashboard.controller.ts`
- `pendingAdvances`: filtered by `status = 'PENDING'`
- `monthlySalary` / `getSalaryTrends`: query `salary_releases` table; wrapped in try/catch to return 0/empty if table missing

### `loans.controller.ts` — extendLoan fix
```typescript
const maxRow = await queryOne<{ maxNum: number }>(
  `SELECT MAX(installment_number) as maxNum FROM loan_installments WHERE loan_id = ?`, [id]);
const currentMax = maxRow?.maxNum ?? 0;
const lastRow = currentMax > 0
  ? await queryOne<{ lastDueMonth: string }>(
      `SELECT due_month as lastDueMonth FROM loan_installments WHERE loan_id = ? AND installment_number = ?`,
      [id, currentMax]) : null;
```

### `users.controller.ts`
- All endpoints require `role === 'ADMIN'` (checked via `requireAdmin()` helper)
- `resetPassword`: bcrypt hashes new password, writes audit log
- `setUserStatus`: prevents admin from deactivating their own account

### `exports.controller.ts`
- Queries `salary_releases` (not old `salary_calculations`)
- CSV maps: `period_start` → month column, `released_amount` → total salary
- No holiday references

---

## 8. Server — Middleware

### `auth.middleware.ts`
```typescript
// Accepts both header and query param
const headerToken = req.headers.authorization?.startsWith('Bearer ')
  ? req.headers.authorization.slice(7) : undefined;
const queryToken = req.query.token as string | undefined;
const token = headerToken || queryToken;
```
`?token=` fallback enables payslip/CSV URLs opened directly in a browser tab.

### `validate.middleware.ts`
Zod schema validation — returns 400 with `{ error, details: [{ field, message }] }` on failure.

### `rbac.middleware.ts`
Role-based access control. Roles: `ADMIN > MANAGER`.

### `auditLog.middleware.ts`
Auto-writes to `audit_logs` on POST/PUT/DELETE to most routes.

### Schemas (`validation/schemas.ts`)
Key schemas available:
- `loginSchema`, `registerSchema`
- `createEmployeeSchema`, `updateEmployeeSchema`
- `createAttendanceSchema` (includes optional `roleId`)
- `createLoanSchema`, `extendLoanSchema`
- `createAdvanceSalarySchema`
- `previewSalaryReleaseSchema`, `createSalaryReleaseSchema`, `batchSalaryReleaseSchema`
- `resetPasswordSchema`
- `createSalaryHistorySchema`

---

## 9. Client — Pages & Routes

### Route Table
| Path | Component | Access |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/admin/dashboard` | `AdminDashboardPage` | Any auth |
| `/admin/employees` | `EmployeesPage` | Any auth |
| `/admin/employees/new` | `EmployeeFormPage` | Any auth |
| `/admin/employees/:id` | `EmployeeProfilePage` | Any auth |
| `/admin/employees/:id/edit` | `EmployeeFormPage` | ADMIN only |
| `/admin/employees/:id/attendance/calendar` | `EmployeeAttendanceCalendarPage` | Any auth |
| `/admin/attendance/entry` | `AttendanceEntryPage` | Any auth |
| `/admin/departments` | `DepartmentsPage` | Any auth |
| `/admin/roles` | `RolesPage` | Any auth |
| `/admin/loans` | `LoansPage` | Any auth |
| `/admin/advance-salaries` | `AdvanceSalariesPage` | Any auth |
| `/admin/salary-releases` | `SalaryReleasesPage` | Any auth |
| `/admin/reports` | `ReportsPage` | Any auth |
| `/admin/audit-logs` | `AuditLogsPage` | ADMIN only |
| `/admin/users` | `UserManagementPage` | ADMIN only |

All `/admin/*` routes redirect to `/login` if unauthenticated. Unknown paths redirect to `/`.

### Key Page Descriptions

#### `AttendanceEntryPage`
- Date picker + department filter + search bar at top
- Employee table: each row has an inline **Status dropdown** (`Present` / `Absent`) styled green/red
- **Real-time save** on dropdown change — calls `attendanceAPI.create()` immediately
- Spinner inside dropdown while saving; reverts on failure
- Toast fires per update: `"[Employee Name] — Present/Absent: Attendance updated"`
- "Mark All Present" button for bulk-marking filtered employees
- Live Present/Absent count badges above the table
- `role_id` sent per row (uses `bulkRole` override or employee's default `roleId`)

#### `EmployeeProfilePage` — 6 tabs
1. **Overview** — personal info cards, effective salary rate, salary type badge, quick-action links
2. **Calendar** — month navigation, color-coded attendance days (green/red/grey), salary release bars overlaid
3. **Releases** — paginated table of this employee's `salary_releases`; "New Release" shortcut
4. **Increments** — timeline of `employee_salary_history`; "Add Increment" modal (new absolute rate, reason, notes)
5. **Loans** — loan cards with installment accordion; extend/cancel actions
6. **Advances** — advance table with status badges; approve/reject actions

#### `SalaryReleasesPage` — 3-step wizard
1. **Select** — employee dropdown (search) + quick buttons (All Active, By Department) + date range with presets (Today / This Week / This Month / Custom)
2. **Preview** — calls `/api/salary-releases/preview` or `/batch-preview`
   - DAILY_WAGE: summary card + expandable day-by-day table (date | role | personal rate | role rate | effective rate | amount)
   - FIXED: summary card (base salary | absent days | 4 paid-offs | excess | deduction | net)
   - Both show: advance deductions, loan deductions, calculated net
3. **Confirm** — editable `released_amount` (pre-filled with `calculated_net`), bonus, notes → creates DRAFT → option to immediately Release

Release list below wizard: filters by date, employee, department, status; detail drawer on row click.

#### `UserManagementPage`
- Table: username, full name, role badge (purple=ADMIN / blue=MANAGER), status badge (green/grey)
- "Reset Password" button → modal with password input (min 8 chars)
- "Activate / Deactivate" toggle button per row
- ADMIN route only

#### `AdminDashboardPage`
- 4 `StatCard` components: Total Employees, Active Loans, Monthly Salary (with trend %), Monthly Advances
- Data from `/api/dashboard/stats`

---

## 10. Client — API Layer

File: `client/src/lib/api.ts`

Axios instance with:
- `baseURL = VITE_API_URL || 'http://localhost:5002/api'`
- Request interceptor: attaches `Authorization: Bearer <token>` from `localStorage`
- Response interceptor: on 401, clears auth + redirects to `/login`

Employee photo paths returned by the API are resolved through `getApiResourceUrl()`, so Vite dev and same-origin production deployments both load protected photo redirects correctly.

### Server Environment For Employee Photos
Contabo object storage is S3-compatible. Configure these server env vars before using employee photo upload:

```bash
CONTABO_S3_ENDPOINT=https://<region>.contabostorage.com
CONTABO_S3_REGION=<region-or-default>
CONTABO_S3_BUCKET=<bucket-name>
CONTABO_S3_ACCESS_KEY_ID=<access-key>
CONTABO_S3_SECRET_ACCESS_KEY=<secret-key>
CONTABO_S3_PUBLIC_BASE_URL=<optional-public-base-url>
CONTABO_S3_FORCE_PATH_STYLE=true
CONTABO_S3_SIGNED_URL_EXPIRES_SECONDS=300
```

Photos are stored under `ISMSalarySystem/` and named from `employee-name-phoneNumber-timestamp.ext`.

### API Groups

**`authAPI`** — `login`, `register`, `logout`, `me`

**`employeesAPI`** — `getAll({ isActive, departmentId, search, page, limit })`, `getById`, `create`, `update`, `delete`

**`departmentsAPI`** — `getAll`, `create`, `update`, `delete`

**`rolesAPI`** — `getAll`, `getByDepartment(deptId)`, `create`, `update`, `delete`

**`attendanceAPI`** — `getAll(params)`, `getDaily(date)`, `create({ employeeId, date, status, roleId?, notes? })`, `update(id, data)`, `delete(id)`

**`loansAPI`** — `getAll`, `getById`, `create`, `update`, `extend(id, count)`, `delete`

**`advanceSalariesAPI`** — `getAll`, `create`, `approve(id)`, `reject(id)`, `delete`

**`salaryHistoryAPI`** — `getByEmployee(employeeId)`, `create`, `delete`

**`salaryReleasesAPI`** — `preview`, `batchPreview`, `create`, `batchCreate`, `getAll`, `getById`, `getByEmployee`, `getEmployeeCalendar(id, month)`, `update`, `release`, `batchRelease`, `delete`

**`usersAPI`** — `getAll`, `resetPassword(id, newPassword)`, `setStatus(id, isActive)`

**`dashboardAPI`** — `getStats`, `getSalaryTrends`, `getDepartmentDistribution`, `getAttendanceStats`, `getLoanBreakdown`, `getRecentActivity`

**`exportsAPI`** — `exportPayroll(params)`, `generatePayslip(employeeId, month)` — these return file URLs with `?token=` query param (auth middleware accepts it)

**`auditLogsAPI`** — `getAll(params)`

**Error utilities:**
- `getApiErrorMessage(error, fallback)` — extracts human-readable message from Axios errors or Zod validation details
- `getApiFieldErrors(error)` — returns `Record<field, message>` for form field-level errors

---

## 11. Client — Design System & Theme

### Dark Mode Architecture
- **`ThemeContext.tsx`** — React context with `theme: 'light' | 'dark'` and `toggleTheme()`
- Reads from `localStorage('ism-theme')` on init; falls back to `prefers-color-scheme`
- Applies `dark` class to `<html>` element
- Wrapped in `main.tsx` as `<ThemeProvider>` at root
- Toggle button in both `Sidebar` (desktop) and `Header` (mobile menu)
- Also available on `LoginPage`

### CSS Variables (index.css)
Two sets: `:root` (light) and `.dark`

| Token | Light | Dark |
|---|---|---|
| `--background` | `250 100% 98%` (near-white) | `222 47% 9%` (deep navy) |
| `--foreground` | `248 50% 15%` (dark indigo text) | `220 20% 95%` (near-white) |
| `--primary` | `239 84% 67%` (indigo-500) | `239 84% 67%` (indigo-500) |
| `--accent` | `160 84% 39%` (emerald) | `160 84% 39%` (emerald) |
| `--card` | `0 0% 100%` | `220 35% 14%` |
| `--sidebar-background` | `0 0% 100%` | `222 47% 7%` |
| `--sidebar-primary` | `239 84% 67%` | `239 84% 67%` |

### CSS Component Classes
Defined in `index.css` `@layer components`:

| Class | Description |
|---|---|
| `.app-mesh` | Full-page gradient background (light: soft indigo/violet/emerald orbs; dark: same at 10% intensity) |
| `.glass-panel` | Glassmorphism card — `bg-white/60 backdrop-blur-xl border-white/50`; dark: `bg-white/5 border-white/10` |
| `.glass-surface` | Lighter glass — used for secondary containers |
| `.glass-subtle` | Even lighter glass — inline form sections |
| `.stat-card` | Extends `.glass-panel` with p-6, hover shadow animation |

> **Important:** `dark:` variant classes cannot be used inside `@apply` in CSS files. Dark mode for CSS classes uses `.dark .class-name {}` selector blocks instead.

### Typography
- Font: **Plus Jakarta Sans** (300, 400, 500, 600, 700, italic 400)
- Applied via `font-sans` (configured in `tailwind.config.ts`)
- `h1–h6`: `font-semibold tracking-tight`

### Color Palette (Tailwind)
- Primary: `indigo-500 / indigo-600` (`#6366f1`)
- CTA accent: `emerald-500` (`#10b981`)
- Destructive: `rose-600`
- Success: `emerald-600`
- Warning: `amber-500`

### Animations
- `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, `animate-pulse-slow`
- Framer Motion: page entrance animations on `StatCard` (stagger by index), login panel spring animation
- All respect `useReducedMotion()`

---

## 12. Authentication & Authorization

### JWT Flow
1. `POST /api/auth/login` → server validates credentials, returns `{ token, user }`
2. Client stores `token` in `localStorage`, user object in `localStorage`
3. All API requests: `Authorization: Bearer <token>` header (Axios interceptor)
4. Export/payslip URLs: `?token=<jwt>` query parameter (auth middleware accepts both)
5. On 401: Axios interceptor clears localStorage, redirects to `/login`

### JWT Payload
```typescript
{ id: string, username: string, full_name: string, role: 'ADMIN' | 'MANAGER' }
```

### Roles
| Role | Access |
|---|---|
| `ADMIN` | Full access — includes user management, audit logs, employee edit, user status/password |
| `MANAGER` | Most features — cannot access `/admin/audit-logs`, `/admin/users`, cannot edit employees |

### Protected Routes (client)
- `ProtectedRoute` wrapper: redirects unauthenticated users to `/login`
- `RoleRoute adminOnly`: redirects MANAGER users to `/admin/dashboard`

---

## 13. Pending Actions

### ⚠️ DB Migration Not Yet Executed
**Files:**
- `server/src/database/migrations/015_salary_releases_overhaul.sql`
- `server/src/database/migrations/016_employee_photo_and_auto_employee_id.sql`

Run this against the MySQL database **once** via MySQL Workbench (or CLI):
```bash
mysql -u <user> -p <database> < server/src/database/migrations/015_salary_releases_overhaul.sql
mysql -u <user> -p <database> < server/src/database/migrations/016_employee_photo_and_auto_employee_id.sql
```

**What it does:**
1. `SET FOREIGN_KEY_CHECKS = 0`
2. DROP `salary_calculations`, `daily_salary_releases`, `holiday_employees`, `holidays`
3. `SET FOREIGN_KEY_CHECKS = 1`
4. `ALTER TABLE attendance ADD COLUMN role_id CHAR(36) NULL` + FK + index
5. `CREATE TABLE salary_releases` with all columns, FKs, and indexes
6. `ALTER TABLE employees ADD COLUMN photo_url, photo_key` for Contabo employee photo retrieval

**Until this is run:**
- Dashboard salary stats return `0` (graceful fallback, no 500 error)
- Salary Releases page will fail to load (table missing)
- Attendance role_id column does not exist (attendance still works, but role won't be saved)
- Employee photo uploads will fail because `photo_url` and `photo_key` do not exist

### After Migration
- Restart the Node.js server process
- All salary release, role rotation, and export features become fully operational

---

*Document covers all changes made through 2026-04-28. Generated from live codebase state.*
