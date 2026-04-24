# ISM Salary System — Server Architecture

## Overview

The server is a Node.js/Express REST API built with TypeScript for the ISM Salary Management System. It provides JWT-based authentication, role-based access control (RBAC), Zod input validation, audit logging, and connects to a MySQL 8+ database via connection pooling. The server implements 13 API route modules covering all salary management operations.

**Build status**: ✅ Builds and runs successfully  
**Dev server**: `npm run dev` (nodemon + ts-node) on port 5002  
**Production build**: `npm run build` compiles to `dist/`; `npm start` runs the compiled JS

---

## Directory Structure

```
server/
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── RUN_IN_MYSQL_WORKBENCH.sql       # Legacy migration script
├── UPDATE_TO_DAILY_WAGE.sql         # Legacy salary type migration
└── src/
    ├── server.ts                    # HTTP server entry point (port binding)
    ├── app.ts                       # Express app configuration and middleware stack
    ├── types/
    │   └── index.ts                 # UserRole enum, AuthUser, AuthRequest interfaces
    ├── validation/
    │   └── schemas.ts               # Zod validation schemas for all endpoints
    ├── utils/
    │   ├── db.ts                    # MySQL connection pool, query/execute helpers, UUID generation
    │   └── auditLog.ts              # AuditAction enum and writeAuditLog function
    ├── middleware/
    │   ├── auth.middleware.ts        # JWT token verification and user attachment
    │   ├── rbac.middleware.ts        # Role-based access control
    │   ├── auditLog.middleware.ts    # Automatic audit trail for mutations
    │   └── validate.middleware.ts    # Zod schema validation for body and query
    ├── controllers/
    │   ├── auth.controller.ts        # Register, login, logout, getCurrentUser
    │   ├── employees.controller.ts   # Employee CRUD with profile aggregation
    │   ├── departments.controller.ts # Department CRUD with FK protection
    │   ├── roles.controller.ts       # Role CRUD with department association
    │   ├── attendance.controller.ts  # Attendance CRUD, daily view, calendar
    │   ├── loans.controller.ts       # Loan CRUD, installments, settle, extend
    │   ├── advanceSalaries.controller.ts # Advance salary with approval workflow
    │   ├── salary.controller.ts      # Salary calculation (FIXED + DAILY_WAGE)
    │   ├── salaryHistory.controller.ts # Employee salary change tracking
    │   ├── holidays.controller.ts    # Holiday CRUD with scoping
    │   ├── dailySalaryReleases.controller.ts # Daily release generation and payouts
    │   ├── dashboard.controller.ts   # Dashboard analytics and statistics
    │   └── auditLogs.controller.ts   # Audit log retrieval with passkey gate
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── employees.routes.ts
    │   ├── departments.routes.ts
    │   ├── roles.routes.ts
    │   ├── attendance.routes.ts
    │   ├── loans.routes.ts
    │   ├── advanceSalaries.routes.ts
    │   ├── salary.routes.ts
    │   ├── salaryHistory.routes.ts
    │   ├── holidays.routes.ts
    │   ├── dailySalaryReleases.routes.ts
    │   ├── dashboard.routes.ts
    │   └── auditLogs.routes.ts
    └── database/
        ├── add_role_levels.sql
        ├── setup/
        │   ├── 01_create_schema.sql   # Full schema creation (14 tables)
        │   ├── 02_seed_sri_lanka_data.sql # Sri Lanka test data
        │   └── README.md
        └── migrations/
            ├── 006_daily_salary_releases.sql
            ├── 007_loans_daily_repayment.sql
            ├── 008_advance_salaries_status.sql
            ├── 009_holiday_employee_scoping.sql
            ├── 010_role_system_update.sql
            ├── 011_remove_half_day.sql
            ├── 012_audit_log_description.sql
            ├── 013_loan_installment_paid_at.sql
            └── check_migration_status.sql
```

---

## Application Entry Point

### server.ts

Creates an HTTP server that listens on the port specified by the `PORT` environment variable (default: 5002). The server is a thin wrapper around the Express `app` module.

### app.ts — Middleware Stack

The Express application configures the following middleware in order:

1. **Helmet** — Security headers with `contentSecurityPolicy` disabled and `crossOriginResourcePolicy` set to `cross-origin`
2. **General rate limiter** — 300 requests per 15-minute window for all endpoints
3. **Auth rate limiter** — 20 requests per 15-minute window, applied specifically to `/api/auth` routes
4. **CORS** — Environment-aware origin handling:
   - Development: allows all origins
   - Production: restricts to `http://localhost:3000`, `http://localhost:8080`, and the `CLIENT_URL` env var
   - Supports credentials, standard HTTP methods, and common headers
5. **Morgan** — Request logging (`combined` format in production, `dev` format otherwise)
6. **Body parsing** — JSON and URL-encoded with a 1MB size limit
7. **Cookie parser** — For cookie-based interactions

### Health Check

`GET /health` performs a database connectivity check (`SELECT 1`). Returns `200 { status: "ok", database: "connected" }` when healthy, or `503 { status: "degraded", database: "disconnected" }` when the database is unreachable.

### Error Handling

The application implements structured error handling:

- **404 handler**: Returns `{ error: "Route not found", path, method }` for undefined routes
- **CORS errors**: Returns `403 { error: "CORS: Origin not allowed" }` for blocked origins
- **JSON parse errors**: Returns `400 { error: "Invalid JSON in request body" }` for malformed JSON
- **Generic errors**: Returns `500 { error: "Internal server error" }` in production; includes `message` and `stack` in development

---

## Type System

### UserRole Enum

```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}
```

The two roles define the system's access control model. ADMIN users have full access including user registration, employee editing/deletion, and audit log access. MANAGER users have data-entry access — they can create records, view data, but cannot approve, release, edit/delete employees, or view audit logs.

This enum aligns with the database schema, which defines the `users.role` column as `ENUM('ADMIN', 'MANAGER')`.

### AuthUser and AuthRequest

`AuthUser` represents the authenticated user attached to requests by the auth middleware (id, username, full_name, role). `AuthRequest` extends the Express `Request` type with an optional `user` property.

---

## Middleware

### Authentication (`auth.middleware.ts`)

The `authenticate` middleware extracts the JWT token from the `Authorization: Bearer <token>` header, verifies it using the `JWT_SECRET` environment variable, and attaches the decoded user (id, username, full_name, role) to `req.user`. Returns 401 for missing or invalid tokens.

### Role-Based Access Control (`rbac.middleware.ts`)

The `authorize(...roles)` middleware factory accepts one or more `UserRole` values. It checks that `req.user.role` is included in the allowed roles list. Returns 401 if no user is present, or 403 if the user's role is not authorized.

### Input Validation (`validate.middleware.ts`)

Two middleware factories are provided:

- **`validate(schema)`** — Validates `req.body` against a Zod schema. On success, replaces `req.body` with the parsed and typed data. On failure, returns `400 { error: "Validation failed", details: [{ field, message, code }] }`.
- **`validateQuery(schema)`** — Same behavior for `req.query` parameters with the error message "Query validation failed".

### Audit Logging (`auditLog.middleware.ts`)

The `auditLog(tableName, action)` middleware factory:

1. For UPDATE actions, fetches the previous state of the record before the handler executes
2. Hooks into the response `finish` event to write the log entry asynchronously
3. Only logs for successful responses (2xx/3xx status codes)
4. Captures: table name, action type, actor ID, actor role (ADMIN/MANAGER), record ID, before/after data snapshots, IP address, user agent, and a human-readable description

---

## Validation Schemas

All input validation uses Zod schemas defined in `src/validation/schemas.ts`. The following schemas are implemented:

| Schema | Used By | Key Validations |
|--------|---------|-----------------|
| `registerSchema` | Auth register | username min 3 chars, password min 8 chars, fullName required, role defaults to MANAGER |
| `loginSchema` | Auth login | username and password required |
| `createEmployeeSchema` | Employee create | employeeId, fullName, departmentId, hireDate required; salaryType defaults to DAILY_WAGE |
| `updateEmployeeSchema` | Employee update | All fields optional |
| `createDepartmentSchema` | Department create | name required (max 100 chars) |
| `updateDepartmentSchema` | Department update | All fields optional |
| `createRoleSchema` | Role create | name and departmentId required |
| `updateRoleSchema` | Role update | All fields optional |
| `createAttendanceSchema` | Attendance create | employeeId, date (YYYY-MM-DD), status (PRESENT or ABSENT) |
| `updateAttendanceSchema` | Attendance update | status and notes optional |
| `createLoanSchema` | Loan create | employeeId and loanAmount required; repaymentMode defaults to MONTHLY |
| `updateLoanSchema` | Loan update | status, balance, and repayment fields optional |
| `settleLoanSchema` | Loan settle | Optional notes |
| `extendLoanSchema` | Loan extend | numInstallments 1-60 required |
| `updateInstallmentSchema` | Installment update | amount and status optional |
| `createAdvanceSalarySchema` | Advance create | employeeId, amount, advanceDate required |
| `updateAdvanceSalaryStatusSchema` | Advance status | status must be PENDING, APPROVED, or REJECTED |
| `calculateSalarySchema` | Salary calc | employeeId and month required; bonus defaults to 0 |
| `createHolidaySchema` | Holiday create | date, name, type (PAID/UNPAID) required; scope defaults to GLOBAL |
| `updateHolidaySchema` | Holiday update | All fields optional |
| `updateHolidayEmployeesSchema` | Holiday employees | employeeIds array, min 1 |
| `generateDailyReleasesSchema` | Daily release gen | date required (YYYY-MM-DD) |
| `releaseAllDailySalariesSchema` | Bulk release | date required (YYYY-MM-DD) |
| `createSalaryHistorySchema` | Salary history | effectiveFrom, salaryType, baseSalary, reason required |
| `verifyPasskeySchema` | Audit logs | passkey required |
| `paginationQuerySchema` | Shared | page defaults to "1", limit defaults to "50" |

---

## API Routes

All routes are registered under the `/api/` prefix. The auth routes have a stricter rate limiter (20 requests per 15 minutes).

### Authentication (`/api/auth`)

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/register` | authenticate, authorize(ADMIN), validate(registerSchema) | Register new user (admin only) |
| POST | `/login` | validate(loginSchema) | Login and receive JWT token |
| GET | `/me` | authenticate | Get current authenticated user |
| POST | `/logout` | authenticate | Logout current user |

### Employees (`/api/employees`)

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/` | authenticate | List all employees |
| GET | `/:id` | authenticate | Get employee by ID |
| GET | `/:id/profile` | authenticate | Get employee profile with aggregated data |
| POST | `/` | authenticate, authorize(ADMIN, MANAGER), validate, auditLog | Create employee |
| PUT | `/:id` | authenticate, authorize(ADMIN), validate, auditLog | Update employee (admin only) |
| DELETE | `/:id` | authenticate, authorize(ADMIN), auditLog | Delete employee (admin only) |

### Other Route Modules

All 13 route modules follow a similar pattern with `authenticate`, `authorize`, `validate`, and `auditLog` middleware applied as appropriate:

- `/api/departments` — Department CRUD
- `/api/roles` — Role CRUD with department filter
- `/api/attendance` — Attendance CRUD, daily view, employee calendar
- `/api/loans` — Loan CRUD, installments, settle, extend
- `/api/advance-salaries` — Advance salary CRUD with approval workflow
- `/api/salary` — Salary calculation
- `/api/salary-history` — Employee salary change history
- `/api/holidays` — Holiday CRUD with GLOBAL/PER_EMPLOYEE scoping
- `/api/audit-logs` — Audit log retrieval with passkey verification
- `/api/dashboard` — Dashboard analytics (stats, trends, distributions)
- `/api/daily-releases` — Daily salary release generation and management

---

## Database

### Connection Pool

The database utility (`src/utils/db.ts`) creates a MySQL connection pool using `mysql2/promise` with the following configuration sourced from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_HOST` | `localhost` | MySQL server host |
| `DATABASE_PORT` | `3306` | MySQL server port |
| `DATABASE_USER` | `root` | Database user |
| `DATABASE_PASSWORD` | (empty) | Database password |
| `DATABASE_NAME` | `ism_salary` | Database name |

The pool is configured with 10 maximum connections and wait-for-connections enabled.

Three query helpers are exported:

- `query<T>(sql, params)` — Returns multiple rows
- `queryOne<T>(sql, params)` — Returns first row or null
- `execute(sql, params)` — Returns `ResultSetHeader` for write operations

UUID generation uses `uuid` v4 via the `generateId()` export.

### Schema (14 Tables)

The database schema (`src/database/setup/01_create_schema.sql`) defines the following tables with proper foreign key constraints, unique indexes, and composite indexes:

| Table | Key Columns | Notes |
|-------|------------|-------|
| `departments` | id, name (unique), description | Base reference table |
| `users` | id, username (unique), password_hash, role `ENUM('ADMIN', 'MANAGER')` | Auth users |
| `roles` | id, department_id (FK), name, level, daily_wage | Unique on (department_id, name, level) |
| `employees` | id, employee_id (unique), department_id (FK), role_id (FK), salary_type `ENUM('FIXED', 'DAILY_WAGE')` | Core entity |
| `attendance` | id, employee_id (FK), date, status `ENUM('PRESENT', 'ABSENT')` | Unique on (employee_id, date) |
| `loans` | id, employee_id (FK), loan_amount, remaining_balance, status, repayment_mode `ENUM('MONTHLY', 'DAILY')` | With daily_repayment_amount |
| `loan_installments` | id, loan_id (FK), installment_number, due_month, amount, status | Unique on (loan_id, installment_number) |
| `advance_salaries` | id, employee_id (FK), amount, advance_date, status `ENUM('PENDING', 'APPROVED', 'REJECTED')` | With slip_photo_url |
| `salary_calculations` | id, employee_id (FK), month, base_salary, daily_wage_total, bonus, deductions, total_salary, status | DRAFT/FINALIZED/PAID |
| `employee_salary_history` | id, employee_id (FK), effective_from, salary_type, base_salary, reason, changed_by (FK) | Salary change tracking |
| `holidays` | id, date (unique), name, type `ENUM('PAID', 'UNPAID')`, scope | GLOBAL or PER_EMPLOYEE |
| `holiday_employees` | id, holiday_id (FK), employee_id (FK) | Junction table for PER_EMPLOYEE holidays |
| `daily_salary_releases` | id, employee_id (FK), release_date, daily_wage, deductions, net_amount, status | PENDING/RELEASED |
| `audit_logs` | id, table_name, action, record_id, changed_by (FK), previous_data (JSON), new_data (JSON), description | Comprehensive audit trail |

### Audit Trail

The audit logging system captures all data mutations through the `auditLog.middleware.ts` and `utils/auditLog.ts`:

- **Nine action types**: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS, APPROVE, REJECT, RELEASE
- **Role attribution**: Each audit entry includes the actor's role (`[ADMIN]` or `[MANAGER]` prefix in description)
- **Data snapshots**: JSON-serialized before/after data for UPDATE operations
- **Request metadata**: IP address and user agent for forensic analysis

---

## Environment Configuration

The server requires the following environment variables (see `.env.example`):

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=ism_salary

# Server
PORT=5002
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key

# CORS
CLIENT_URL=http://localhost:3000
```

---

## Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| Node.js | Runtime | >= 18 |
| Express | Web framework | 4.21.2 |
| TypeScript | Language | 5.7.2 |
| MySQL | Database (via mysql2/promise) | 3.11.3 |
| Zod | Input validation | 3.23.8 |
| jsonwebtoken | JWT authentication | 9.0.2 |
| bcrypt | Password hashing | 5.1.1 |
| Helmet | Security headers | 7.1.0 |
| express-rate-limit | Rate limiting | 7.4.1 |
| Morgan | Request logging | 1.10.0 |
| uuid | UUID v4 generation | 10.0.0 |
| cookie-parser | Cookie handling | 1.4.7 |
| Multer | File upload (dependency installed) | 1.4.5-lts.2 |
| dotenv | Environment variable loading | 16.4.5 |
