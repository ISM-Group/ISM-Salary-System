# ISM Salary System — Complete System Documentation

**Last updated:** 2026-04-29  
**Status:** Active development — migrations 015–020 executed on MariaDB

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
- Department-level payroll rules (paid leave days, full attendance bonus days)
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
| Database | MariaDB (InnoDB, utf8mb4) — `dateStrings: true` in pool config so DATE columns return as `"YYYY-MM-DD"` strings |
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
├── .github/workflows/
│   ├── client-deploy.yml             # Vite build → Nginx on VPS
│   └── server-deploy.yml             # tsc build → pm2 on VPS (NODE_OPTIONS=--max-old-space-size=512 for npm ci)
├── server/
│   └── src/
│       ├── app.ts                        # Express app setup, middleware, route mounts
│       ├── server.ts                     # HTTP server entry point
│       ├── types/index.ts                # AuthRequest, AuthUser, UserRole types
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── attendance.controller.ts  # getAttendance, getDailyAttendance, createAttendance (upsert), updateAttendance, getEmployeeAttendanceCalendar
│       │   ├── dashboard.controller.ts
│       │   ├── departments.controller.ts
│       │   ├── departmentRules.controller.ts  # NEW — getDepartmentRules, upsertDepartmentRules, deleteDepartmentRules
│       │   ├── employees.controller.ts
│       │   ├── exports.controller.ts
│       │   ├── loans.controller.ts
│       │   ├── advanceSalaries.controller.ts
│       │   ├── salaryHistory.controller.ts
│       │   ├── salaryReleases.controller.ts   # preview, batch, create, release, getEmployeeCalendar; includes dept rules logic
│       │   ├── users.controller.ts
│       │   ├── roles.controller.ts
│       │   └── auditLogs.controller.ts
│       ├── middleware/
│       │   ├── auth.middleware.ts
│       │   ├── rbac.middleware.ts
│       │   ├── validate.middleware.ts
│       │   └── auditLog.middleware.ts
│       ├── routes/
│       │   ├── departmentRules.routes.ts  # NEW
│       │   └── ... (one file per resource)
│       ├── utils/
│       │   ├── db.ts                     # query(), queryOne(), execute(), generateId(); dateStrings:true
│       │   ├── auditLog.ts
│       │   ├── fileStorage.ts
│       │   └── pagination.ts
│       ├── validation/schemas.ts         # all Zod schemas incl. upsertDepartmentRulesSchema
│       └── database/
│           ├── setup/
│           └── migrations/
│               ├── 006–014_*.sql         # historical (already run)
│               ├── 015_salary_releases_overhaul.sql      # executed ✓
│               ├── 016_employee_photo_and_auto_employee_id.sql  # executed ✓
│               ├── 017–019_*.sql         # executed ✓
│               └── 020_department_rules.sql              # executed ✓
├── client/
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   └── ThemeContext.tsx
│       ├── components/
│       │   ├── layout/
│       │   └── ui/
│       ├── pages/
│       │   ├── auth/LoginPage.tsx
│       │   └── admin/
│       │       ├── AdminDashboardPage.tsx
│       │       ├── AttendanceEntryPage.tsx     # local-state batch save (Save Attendance button)
│       │       ├── EmployeesPage.tsx
│       │       ├── EmployeeProfilePage.tsx     # 6-tab portal; Calendar tab with color-coded boxes
│       │       ├── EmployeeFormPage.tsx
│       │       ├── EmployeeAttendanceCalendarPage.tsx
│       │       ├── DepartmentsPage.tsx         # includes inline Rules panel per department
│       │       ├── RolesPage.tsx
│       │       ├── LoansPage.tsx
│       │       ├── AdvanceSalariesPage.tsx
│       │       ├── SalaryReleasesPage.tsx      # 3-step wizard; shows paid-leave/bonus rule summary in preview
│       │       ├── UserManagementPage.tsx
│       │       ├── ReportsPage.tsx
│       │       └── AuditLogsPage.tsx
│       ├── hooks/
│       └── lib/
│           ├── api.ts                    # all Axios API calls incl. departmentRulesAPI
│           ├── utils.ts
│           └── formValidation.ts
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
photo_url VARCHAR(500), photo_key VARCHAR(500),
user_id FK→users NULL,
created_at, updated_at
```

#### `employee_salary_history`
```sql
id CHAR(36) PK, employee_id FK→employees,
salary_type ENUM('FIXED','DAILY_WAGE'),
base_salary DECIMAL(12,2),
effective_from DATE,
reason VARCHAR(500), notes TEXT,
changed_by FK→users,
created_at
```

#### `attendance`
```sql
id CHAR(36) PK, employee_id FK→employees,
role_id CHAR(36) NULL FK→roles ON DELETE SET NULL,
date DATE, status ENUM('PRESENT','ABSENT'),
notes TEXT, created_at, updated_at
UNIQUE KEY (employee_id, date)
```

#### `department_rules`  ← **NEW — migration 020**
```sql
id CHAR(36) PK,
department_id CHAR(36) NOT NULL FK→departments ON DELETE CASCADE,
paid_leave_days TINYINT NOT NULL DEFAULT 0,        -- first N absences paid at daily rate
full_attendance_bonus_days TINYINT NOT NULL DEFAULT 0,  -- extra days pay if zero absences
created_at TIMESTAMP, updated_at TIMESTAMP
UNIQUE KEY (department_id)   -- one rules profile per department
```

Rules are optional — departments with no row behave identically to the default (0, 0).  
Paid leave and full attendance bonus are mutually exclusive (paid leave needs absences > 0; bonus needs absences = 0).

#### `loans`
```sql
id CHAR(36) PK, employee_id FK→employees,
loan_amount DECIMAL(12,2), remaining_balance DECIMAL(12,2),
repayment_type ENUM('DAILY','MONTHLY'),
daily_repayment_amount DECIMAL(12,2) NULL,
installment_count INT NULL,
status ENUM('ACTIVE','PAID','CANCELLED'),
start_date DATE, notes TEXT,
created_at, updated_at
```

#### `loan_installments`
```sql
id CHAR(36) PK, loan_id FK→loans,
installment_number INT,
due_month DATE,
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

#### `salary_releases`
```sql
id CHAR(36) PK,
employee_id FK→employees ON DELETE CASCADE,
period_start DATE, period_end DATE,
release_type ENUM('DAILY','WEEKLY','MONTHLY','CUSTOM') DEFAULT 'CUSTOM',
salary_type ENUM('FIXED','DAILY_WAGE'),
working_days INT DEFAULT 0,
gross_amount DECIMAL(12,2) DEFAULT 0,   -- includes paid-leave and bonus rule additions (baked in at create time)
absent_deduction DECIMAL(12,2) DEFAULT 0,
advance_deductions DECIMAL(12,2) DEFAULT 0,
loan_deductions DECIMAL(12,2) DEFAULT 0,
bonus DECIMAL(12,2) DEFAULT 0,
calculated_net DECIMAL(12,2) DEFAULT 0,
released_amount DECIMAL(12,2) DEFAULT 0,
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

### Dropped Tables (migration 015 removed these)
- `salary_calculations`, `daily_salary_releases`, `holidays`, `holiday_employees`

---

## 5. Business Logic Rules

### Effective Personal Rate
`getEffectiveRate(employeeId)`:
1. Query `employee_salary_history` WHERE `employee_id = ?` AND `salary_type = employee.salary_type` ORDER BY `effective_from DESC LIMIT 1`
2. If a record exists → `personalRate = history.base_salary`
3. If no history → `personalRate = employees.base_salary ?? roles.daily_wage ?? 0`

### Department Payroll Rules (DAILY_WAGE only)
`getDepartmentRulesForEmployee(employeeId)`:
- Looks up `employees.department_id`, queries `department_rules`
- Returns `{ paidLeaveDays: 0, fullAttendanceBonusDays: 0 }` if no department or no row (zero-impact default)

Rules are applied inside `buildDailyWagePreview()` after the base calculation:

**Paid leave** (applied when `paidLeaveDays > 0` AND `totalAbsentDays > 0`):
- `paidLeaveDaysApplied = MIN(paidLeaveDays, totalAbsentDays)`
- For first N absent days (date order): mark as `paidLeave: true`, add `effectiveRate` to `grossAmount`

**Full attendance bonus** (applied when `fullAttendanceBonusDays > 0` AND `totalAbsentDays === 0` AND `workingDays > 0`):
- `bonusAmount = personalRate × fullAttendanceBonusDays`
- Added to `grossAmount`

Rules are mutually exclusive. Both are baked into `gross_amount` at preview/create time — no extra columns in `salary_releases`.

Example (2000 LKR/day, paidLeaveDays=3, fullAttendanceBonusDays=3):
- 29/31 present (2 absences): `(29 + 2) × 2000 = 62,000`
- 31/31 present (0 absences): `31 × 2000 + 3 × 2000 = 68,000`
- 27/31 present (4 absences): `(27 + 3) × 2000 = 60,000` (paid leave capped at 3)

### DAILY_WAGE Salary Release Calculation
- For every **PRESENT** attendance record in the period:
  - `effectiveRate = MAX(personalRate, attendance.role.daily_wage)`
  - If `attendance.role_id` is NULL → `roleDailyWage = 0` → `effectiveRate = personalRate`
- `gross_amount = SUM(effectiveRate for PRESENT days) + paid-leave additions + bonus addition`
- `working_days = COUNT(PRESENT records in period)` (does NOT include paid-leave absent days)
- `averageDailyRate` computed from present-only gross (before rule additions)
- `advance_deductions = SUM(approved advance_salaries.amount WHERE advance_date BETWEEN period)`
- **Loan deductions — DAILY:** `SUM(daily_repayment_amount) × working_days`
- **Loan deductions — MONTHLY:** only when `release_type = 'MONTHLY'`; deducts PENDING installments whose `due_month` falls within the period
- `calculated_net = gross - advance_deductions - loan_deductions + bonus`

### FIXED Salary Release Calculation
- Always `release_type = 'MONTHLY'`
- `baseSalary = getEffectiveRate(employeeId).personalRate`
- `absent_days = COUNT(ABSENT attendance records in period)`
- **4 paid-offs rule:** `paidOffs = MIN(4, absent_days)` — first 4 absences always paid, no carry-over
- `excess_absent = MAX(0, absent_days - 4)`
- `absent_deduction = excess_absent × (baseSalary / 30)` — always divided by 30
- `gross_amount = baseSalary`
- `calculated_net = gross - absent_deduction - advance_deductions - loan_deductions + bonus`

### Release Action (DRAFT → RELEASED)
1. Status → `RELEASED`, `released_by = req.user.id`
2. DAILY loans: `remaining_balance -= loan_deduction_amount`; if ≤ 0 → `status = 'PAID'`
3. MONTHLY loans: PENDING installments in period → `status = 'PAID'`, `paid_at = NOW()`
4. Audit log: `AuditAction.RELEASE`

### Release Type Detection (auto)
`detectReleaseType(from, to)`:
- Same day → `DAILY`
- Exactly 7 days → `WEEKLY`
- `from` = first of month AND `to` = last of month → `MONTHLY`
- Otherwise → `CUSTOM`

### Date Handling (critical)
**Server:** `db.ts` pool uses `dateStrings: true` — all DATE/DATETIME columns return as `"YYYY-MM-DD"` strings, never JS Date objects. Without this, MariaDB DATE columns would serialize as ISO UTC timestamps causing off-by-one dates in UTC+5:30 (Sri Lanka).

**Client:** All local date helpers use `getFullYear()/getMonth()/getDate()` (local time), not `.toISOString().slice(0,10)` (UTC). Applies to date defaults in `AttendanceEntryPage`, date presets in `SalaryReleasesPage`.

**Calendar date normalization:** `EmployeeProfilePage` handles both `"YYYY-MM-DD"` (with `dateStrings:true`) and ISO timestamp strings (fallback) when building `attendanceByDate` map.

### Loan extendLoan (two-query pattern)
Two separate queries to avoid MySQL/MariaDB aggregate ambiguity:
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

**Auth also accepts `?token=<jwt>`** — used by export/payslip URLs opened in browser.

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

### Department Rules `/api/department-rules`  ← **NEW**
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/:departmentId` | Any auth | Get rules for a department (returns `{ paidLeaveDays: 0, fullAttendanceBonusDays: 0 }` if none) |
| PUT | `/:departmentId` | ADMIN | Upsert rules (body: `{ paidLeaveDays, fullAttendanceBonusDays }`) |
| DELETE | `/:departmentId` | ADMIN | Remove rules row |

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
| GET | `/:id` | Get single employee |
| GET | `/:id/photo` | Redirect to readable employee photo URL |
| POST | `/` | Create employee; `employeeId` autogenerated; accepts multipart `photo` |
| PUT | `/:id` | Update employee; accepts multipart `photo` |
| DELETE | `/:id` | Deactivate employee |

### Attendance `/api/attendance`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List attendance records (`?employeeId`, `?from`, `?to`, `?status`) |
| GET | `/daily` | All records for a date `?date=YYYY-MM-DD`; defaults to today (local time) |
| GET | `/employee/:employeeId/calendar` | Employee calendar (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) |
| POST | `/` | Create/upsert attendance (body: `{ employeeId, date, status, roleId?, notes? }`); `roleId` defaults to employee's `role_id` |
| PUT | `/:id` | Update attendance record |

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
| GET | `/:employeeId` | All history entries |
| POST | `/` | Add increment record |
| DELETE | `/:id` | Remove history entry |

### Salary Releases `/api/salary-releases`
| Method | Path | Description |
|---|---|---|
| POST | `/preview` | Preview single release (applies dept rules; returns `paidLeaveDaysApplied`, `fullAttendanceBonusApplied`, `ruleGrossAddition`) |
| POST | `/batch-preview` | Preview multiple employees |
| POST | `/` | Create DRAFT release |
| POST | `/batch` | Create DRAFT releases for multiple employees |
| GET | `/` | List releases (`?employeeId`, `?from`, `?to`, `?status`, `?departmentId`, `?page`) |
| GET | `/:id` | Single release (includes day breakdown; `paidLeave: true` on paid-leave days) |
| GET | `/employee/:id` | All releases for an employee |
| GET | `/employee/:id/calendar` | Month view (`?month=YYYY-MM` → attendance + releases) |
| PUT | `/:id` | Update DRAFT (notes, released_amount, bonus) |
| PUT | `/:id/release` | DRAFT → RELEASED (triggers loan balance updates) |
| PUT | `/batch-release` | Release multiple (body: `{ ids[] }` or `{ from, to }`) |
| DELETE | `/:id` | Delete DRAFT only |

### Users `/api/users`  *(ADMIN only)*
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all users |
| PUT | `/:id/reset-password` | Reset password |
| PUT | `/:id/status` | Activate/deactivate |

### Dashboard `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | KPI summary |
| GET | `/salary-trends` | Monthly salary trend (`?months=6`) |
| GET | `/department-distribution` | Headcount by department |
| GET | `/attendance-stats` | Present/Absent counts by month |
| GET | `/loan-breakdown` | Loan status breakdown |
| GET | `/recent-activity` | Recent audit log entries |

### Exports `/api/exports`
| Method | Path | Description |
|---|---|---|
| GET | `/payroll` | CSV payroll export (`?from`, `?to`, `?departmentId`) |
| GET | `/payslip/:employeeId` | PDF payslip (`?month=YYYY-MM`) |

---

## 7. Server — Controllers

### `salaryReleases.controller.ts`

**`getEffectiveRate(employeeId)`**
- Returns `{ salaryType, personalRate, baseSalary }`
- Checks `employee_salary_history` first; falls back to `employees.base_salary` / `roles.daily_wage`

**`getDepartmentRulesForEmployee(employeeId)`**  ← NEW
- Queries `department_rules` via employee's `department_id`
- Returns `{ paidLeaveDays: 0, fullAttendanceBonusDays: 0 }` if no department or no row

**`buildDailyWagePreview(employeeId, from, to, personalRate, rules)`**  ← updated signature
- JOINs attendance + roles for each record in period
- `effectiveRate = MAX(personalRate, role.daily_wage)` per PRESENT day
- Applies `rules.paidLeaveDays`: marks first N absent rows as `paidLeave: true`, adds to gross
- Applies `rules.fullAttendanceBonusDays`: if zero absences, adds bonus days × rate to gross
- Returns `{ dayBreakdown[], workingDays, grossAmount, averageDailyRate, paidLeaveDaysApplied, fullAttendanceBonusApplied, ruleGrossAddition }`

**`buildFixedPreview(employeeId, from, to, baseSalary)`**
- Counts ABSENT/PRESENT records
- 4 paid-offs rule, calculates `absentDeduction = excessAbsent × (baseSalary / 30)`
- Returns `{ baseSalary, absentDays, paidOffs, excessAbsent, absentDeduction, grossAmount, workingDays }`

**`calculateLoanDeductions(employeeId, from, to, workingDays, isMonthlyPeriod)`**
- DAILY loans: `SUM(daily_repayment_amount) × workingDays`
- MONTHLY loans: only if `isMonthlyPeriod = true`; sums PENDING installments due in period

**`detectReleaseType(from, to)`** — `'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'`

**`releasePayment` handler**
- Decrements DAILY loan `remaining_balance`; marks PAID if ≤ 0
- Marks MONTHLY installments PAID within release period
- Status → RELEASED, audit log written

### `departmentRules.controller.ts`  ← NEW
- **`getDepartmentRules`**: returns row or `{ paidLeaveDays: 0, fullAttendanceBonusDays: 0 }` if none
- **`upsertDepartmentRules`**: UPDATE or INSERT based on existence check; validates with `upsertDepartmentRulesSchema`
- **`deleteDepartmentRules`**: removes row by `department_id`

### `attendance.controller.ts`
- `getDailyAttendance`: `date` param defaults to today in **local server time** (not UTC)
- `createAttendance`: upsert — UPDATE existing or INSERT new; auto-resolves `roleId` from `employees.role_id` if omitted
- `getEmployeeAttendanceCalendar`: route param is `:employeeId`; requires `?from` and `?to`

### `dashboard.controller.ts`
- `monthlySalary` / `getSalaryTrends`: query `salary_releases`; wrapped in try/catch returning 0/empty if table missing

### `loans.controller.ts`
Two-query extendLoan (avoids MySQL/MariaDB aggregate ambiguity):
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
- All endpoints require `role === 'ADMIN'`
- `resetPassword`: bcrypt hash + audit log
- `setUserStatus`: prevents admin deactivating own account

### `exports.controller.ts`
- Queries `salary_releases` (not old tables)
- CSV: `period_start` → month, `released_amount` → total salary

---

## 8. Server — Middleware

### `auth.middleware.ts`
```typescript
const headerToken = req.headers.authorization?.startsWith('Bearer ')
  ? req.headers.authorization.slice(7) : undefined;
const queryToken = req.query.token as string | undefined;
const token = headerToken || queryToken;
```

### `validate.middleware.ts`
Zod schema validation — returns 400 with `{ error, details: [{ field, message }] }` on failure.

### `rbac.middleware.ts`
Role-based access control. `ADMIN > MANAGER`.

### `auditLog.middleware.ts`
Auto-writes to `audit_logs` on POST/PUT/DELETE to most routes.

### Schemas (`validation/schemas.ts`)
Key schemas:
- `loginSchema`, `registerSchema`
- `createEmployeeSchema`, `updateEmployeeSchema`
- `createAttendanceSchema` (includes optional `roleId`)
- `upsertDepartmentRulesSchema` — `{ paidLeaveDays: int 0–31, fullAttendanceBonusDays: int 0–31 }`  ← NEW
- `createLoanSchema`, `extendLoanSchema`
- `createAdvanceSalarySchema`
- `previewSalaryReleaseSchema`, `createSalaryReleaseSchema`, `batchSalaryReleaseSchema`
- `resetPasswordSchema`, `createSalaryHistorySchema`

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
| `/admin/attendance` | `AttendanceEntryPage` | Any auth |
| `/admin/departments` | `DepartmentsPage` | Any auth |
| `/admin/roles` | `RolesPage` | Any auth |
| `/admin/loans` | `LoansPage` | Any auth |
| `/admin/advance-salaries` | `AdvanceSalariesPage` | Any auth |
| `/admin/salary-releases` | `SalaryReleasesPage` | Any auth |
| `/admin/reports` | `ReportsPage` | Any auth |
| `/admin/audit-logs` | `AuditLogsPage` | ADMIN only |
| `/admin/users` | `UserManagementPage` | ADMIN only |

All `/admin/*` redirect to `/login` if unauthenticated.

### Key Page Descriptions

#### `AttendanceEntryPage`
- Date picker (defaults to today in **local time**) + department filter + role filter + search
- Employee table: **Present / Absent toggle buttons** per row (not a dropdown)
- **Local state** — changes do NOT auto-save to server
- Unsaved rows: amber background + amber dot next to name
- **Save Attendance button** — batch-upserts ALL filtered employees via `attendanceAPI.create()` in parallel
- Save button shows count badge of unsaved rows: `Save Attendance ●12`
- `savedStatuses` derived from DB records; `unsavedIds` set computed from diff
- `useEffect` initialises local state from DB on load, preserving pending local edits
- `markAllPresent` bulk-marks filtered employees in local state only
- `role_id` sent per row (uses `bulkRole` override or employee's default `roleId`)

#### `DepartmentsPage`  ← updated
- Create/edit/delete departments
- **Rules button** per department row — toggles inline rules panel
- Rules panel: `Paid Leave Days` input + `Full Attendance Bonus Days` input + Save/Clear buttons
- Rules cached in `rulesCache` state (lazy-fetched on first open per department)
- Amber **"Rules"** badge next to department name when any rule is non-zero
- `openRules()`, `saveRules()`, `clearRules()` handlers

#### `EmployeeProfilePage` — 6 tabs
1. **Overview** — personal info, salary config, attendance summary, quick links
2. **Calendar** — month navigation, color-coded attendance (emerald=Present, red=Absent, white=No record)
   - Uses `salaryReleasesAPI.getEmployeeCalendar` (`/salary-releases/employee/:id/calendar`)
   - Date keys normalized: handles `"YYYY-MM-DD"` and ISO timestamp strings
   - Empty-month hint: "No attendance records for [Month]. Go to Attendance Entry to save records."
3. **Releases** — table of this employee's `salary_releases`
4. **Increments** — `employee_salary_history` timeline; "Add Increment" modal
5. **Loans** — loan cards with installment accordion
6. **Advances** — advance table with approve/reject actions

#### `SalaryReleasesPage` — 3-step wizard  ← updated
1. **Select** — employee/date range with presets (Today / This Week / This Month / Custom); presets use **local time**
2. **Preview** — calls `/preview` or `/batch-preview`
   - DAILY_WAGE: summary card + day-by-day table
     - Paid-leave absent days: green row + amount + "(paid leave)" label; `paidLeave: true` field
     - Green rule summary banner: `+N paid leave days · +LKR X` or `Full attendance bonus · +LKR X`
   - FIXED: summary card (base | absences | 4 paid-offs | excess | deduction | net)
   - Both show advances, loan deductions, calculated net
3. **Confirm** — editable `released_amount`, bonus, notes → creates DRAFT → optionally Release

Preview detail drawer (right panel) also shows paid-leave row styling.

#### `UserManagementPage`
- Table: username, full name, role badge, status badge
- "Reset Password" modal (min 8 chars)
- "Activate / Deactivate" toggle

#### `AdminDashboardPage`
- 4 StatCards: Total Employees, Active Loans, Monthly Salary, Monthly Advances
- Data from `/api/dashboard/stats`

---

## 10. Client — API Layer

File: `client/src/lib/api.ts`

Axios instance:
- `baseURL = VITE_API_URL || 'http://localhost:5002/api'`
- Request interceptor: `Authorization: Bearer <token>` from `localStorage`
- Response interceptor: on 401, clears auth + redirects to `/login`

### API Groups

**`authAPI`** — `login`, `register`, `logout`, `me`

**`employeesAPI`** — `getAll({ isActive, departmentId, search, page, limit })`, `getById`, `getProfile(id)`, `create`, `update`, `delete`

**`departmentsAPI`** — `getAll`, `create`, `update`, `delete`

**`departmentRulesAPI`**  ← NEW
```typescript
{
  getByDepartment: (deptId) => GET /department-rules/:deptId → { paidLeaveDays, fullAttendanceBonusDays }
  upsert: (deptId, { paidLeaveDays, fullAttendanceBonusDays }) => PUT /department-rules/:deptId
  remove: (deptId) => DELETE /department-rules/:deptId
}
```

**`rolesAPI`** — `getAll`, `getByDepartment(deptId)`, `create`, `update`, `delete`

**`attendanceAPI`** — `getAll(params)`, `getDaily(date)`, `getEmployeeAttendanceCalendar(employeeId, { from, to })`, `create({ employeeId, date, status, roleId?, notes? })`, `update(id, data)`

**`loansAPI`** — `getAll`, `getById`, `create`, `update`, `extend(id, count)`, `delete`

**`advanceSalariesAPI`** — `getAll`, `create`, `approve(id)`, `reject(id)`, `delete`

**`salaryHistoryAPI`** — `getByEmployee(employeeId)`, `create`, `delete`

**`salaryReleasesAPI`** — `preview`, `batchPreview`, `create`, `batchCreate`, `getAll`, `getById`, `getByEmployee`, `getEmployeeCalendar(id, month)`, `update`, `release`, `batchRelease`, `delete`

**`usersAPI`** — `getAll`, `resetPassword(id, newPassword)`, `setStatus(id, isActive)`

**`dashboardAPI`** — `getStats`, `getSalaryTrends`, `getDepartmentDistribution`, `getAttendanceStats`, `getLoanBreakdown`, `getRecentActivity`

**`exportsAPI`** — `exportPayroll(params)`, `generatePayslip(employeeId, month)`, `getPayslipUrl(employeeId, month)`

**`auditLogsAPI`** — `getAll(params)`

**Error utilities:**
- `getApiErrorMessage(error, fallback)` — extracts human-readable message from Axios errors or Zod details
- `getApiFieldErrors(error)` — returns `Record<field, message>` for form field-level errors

---

## 11. Client — Design System & Theme

### Dark Mode Architecture
- **`ThemeContext.tsx`** — `theme: 'light' | 'dark'`, `toggleTheme()`
- Reads from `localStorage('ism-theme')`; falls back to `prefers-color-scheme`
- Applies `dark` class to `<html>`
- Toggle in both `Sidebar` (desktop) and `Header` (mobile)

### CSS Variables (index.css)

| Token | Light | Dark |
|---|---|---|
| `--background` | `250 100% 98%` | `222 47% 9%` |
| `--foreground` | `248 50% 15%` | `220 20% 95%` |
| `--primary` | `239 84% 67%` | `239 84% 67%` |
| `--accent` | `160 84% 39%` | `160 84% 39%` |
| `--card` | `0 0% 100%` | `220 35% 14%` |
| `--sidebar-background` | `0 0% 100%` | `222 47% 7%` |

### CSS Component Classes

| Class | Description |
|---|---|
| `.app-mesh` | Full-page gradient background |
| `.glass-panel` | Glassmorphism card — `bg-white/60 backdrop-blur-xl`; dark: `bg-white/5` |
| `.glass-surface` | Lighter glass |
| `.glass-subtle` | Even lighter glass |
| `.stat-card` | Extends `.glass-panel` with p-6, hover shadow |

> **Important:** `dark:` variant classes cannot be used inside `@apply`. Dark mode for CSS classes uses `.dark .class-name {}` selector blocks.

### Typography
- Font: **Plus Jakarta Sans** (300–700 + italic)
- Applied via `font-sans` in `tailwind.config.ts`

### Color Palette
- Primary: `indigo-500/600` (`#6366f1`)
- CTA accent: `emerald-500` (`#10b981`)
- Destructive: `rose-600`
- Warning: `amber-500`

### Animations
- `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, `animate-pulse-slow`
- Framer Motion: stagger on StatCards, spring on login panel
- All respect `useReducedMotion()`

---

## 12. Authentication & Authorization

### JWT Flow
1. `POST /api/auth/login` → `{ token, user }`
2. Client stores in `localStorage`
3. All requests: `Authorization: Bearer <token>` (Axios interceptor)
4. Export URLs: `?token=<jwt>` query param
5. On 401: clears localStorage, redirects to `/login`

### JWT Payload
```typescript
{ id: string, username: string, full_name: string, role: 'ADMIN' | 'MANAGER' }
```

### Roles
| Role | Access |
|---|---|
| `ADMIN` | Full access — user management, audit logs, employee edit, user status/password, department rules write |
| `MANAGER` | Most features — cannot edit employees, access audit logs/users, or write department rules |

---

## 13. Pending Actions

### ⚠️ Run Migration 020 on MariaDB
File: `server/src/database/migrations/020_department_rules.sql`

Run once in MySQL Workbench (or CLI) against the MariaDB instance.  
Creates the `department_rules` table. Without it:
- Department Rules API returns 500 errors
- Salary previews for departments with rules will fail

### Attendance Records Need to Be Saved
The old `AttendanceEntryPage` auto-save was broken — it only updated UI state, never wrote to DB.  
The new Save Attendance button batch-upserts all visible employees.  
**Action:** Go to Attendance Entry, select a date, mark employees, click Save Attendance.  
The Employee Profile Calendar will show green/red boxes once records exist.

### VPS Deployment
- **OOM kill fix** applied: `server-deploy.yml` now runs `NODE_OPTIONS="--max-old-space-size=512" npm ci --omit=dev`
- Push to `main` to trigger the GitHub Actions deploy
- After deploy, PM2 will restart the server — `dateStrings: true` will take effect on the VPS

### Known Limitations
- `EmployeeAttendanceCalendarPage` (full-page standalone calendar at `/admin/employees/:id/attendance/calendar`) uses the attendance API directly — separate from the in-profile Calendar tab which uses the salary releases calendar endpoint. Both query the same `attendance` table.
- FIXED salary employees get the 4 paid-offs rule regardless of department; department rules only apply to DAILY_WAGE employees.

---

*Document covers all changes through 2026-04-29.*
