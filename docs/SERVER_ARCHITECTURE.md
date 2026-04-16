# ISM-Salary-System - Server Architecture Analysis

## Overview
A Node.js/Express-based REST API for salary management system with MySQL database, built with TypeScript and featuring multi-role access control (RBAC), audit logging, and comprehensive salary calculation.

## Current Status: 🔴 CRITICAL - PRODUCTION NOT READY

### Critical Issues Found:
1. **Missing Configuration Files** ⛔
   - No `package.json` in server root
   - No `tsconfig.json` for TypeScript configuration
   - No `.env.example` for environment variables
   - Cannot install dependencies or build project

2. **npm Install Failed** ⛔
   - Terminal log shows: `npm error code ENOENT` - Cannot find package.json
   - Exit code 254 (package.json not found error)

3. **Missing Core Utilities & Middleware** ⛔
   - Referenced but not provided: `utils/db.ts` (database query functions)
   - Referenced but not provided: `middleware/auth.middleware`
   - Referenced but not provided: `middleware/rbac.middleware`
   - Referenced but not provided: `middleware/auditLog.middleware`
   - Referenced but not provided: `controllers/auth.controller.sql`
   - Referenced but not provided: Various other controllers

---

## Directory Structure

```
server/
├── src/
│   ├── controllers/
│   │   ├── dashboard.controller.ts          # Dashboard analytics
│   │   ├── roles.controller.ts              # Role management
│   │   └── (many others referenced but not found)
│   ├── routes/
│   │   ├── auth.routes.ts                   # Authentication endpoints
│   │   ├── departments.routes.ts            # Department CRUD
│   │   ├── advanceSalaries.routes.ts        # Advance salary management
│   │   ├── auditLogs.routes.ts              # Audit log queries
│   │   ├── (many others referenced but not found)
│   ├── middleware/
│   │   ├── auth.middleware          # ⛔ MISSING (referenced)
│   │   ├── rbac.middleware          # ⛔ MISSING (referenced)
│   │   └── auditLog.middleware      # ⛔ MISSING (referenced)
│   ├── utils/
│   │   ├── db.ts                    # ⛔ MISSING (referenced)
│   │   └── auditLog.ts              # ⛔ MISSING
│   ├── types/
│   │   └── (index.ts)               # ⛔ MISSING (referenced)
│   └── app.ts                       # Express app entry point
├── RUN_IN_MYSQL_WORKBENCH.sql       # Database migration script
├── UPDATE_TO_DAILY_WAGE.sql         # Salary type migration script
├── src/database/
│   ├── add_role_levels.sql          # Role levels setup
│   └── migrations/
│       └── check_migration_status.sql
├── package.json                     # ⛔ MISSING - CRITICAL
├── tsconfig.json                    # ⛔ MISSING - CRITICAL
├── .env.example                     # ⛔ MISSING
└── .env.production                  # ⛔ MISSING
```

---

## Application Entry Point (`src/app.ts`)

### Express Configuration
- **Framework**: Express.js with TypeScript
- **Environment**: Uses `dotenv` to load environment variables
- **CORS**: Dynamic origin validation
  - Development: Allows all origins
  - Production: Allows only specified `allowedOrigins`
  - Whitelist: `http://localhost:3000`, `http://localhost:8080`, `${process.env.CLIENT_URL}`
  
### Middleware Stack
```
CORS → express.json() → express.urlencoded() → cookieParser()
```

### Routes Registered
1. `/api/auth` - Authentication
2. `/api/departments` - Department management
3. `/api/roles` - Role management
4. `/api/employees` - Employee CRUD
5. `/api/attendance` - Attendance tracking
6. `/api/loans` - Loan management
7. `/api/advance-salaries` - Advance salary requests
8. `/api/salary` - Salary calculations
9. `/api/salary-history` - Salary history/records
10. `/api/holidays` - Holiday management
11. `/api/audit-logs` - Audit trail
12. `/api/dashboard` - Dashboard analytics
13. `/api/daily-releases` - Daily release reports

### Error Handling
- Global error handler: catches uncaught errors and returns 500 with generic message
- **ISSUE**: No proper error logging or error classification
- 404 handler for undefined routes

### Health Check
- `GET /health` returns `{ status: 'ok', timestamp: ISO_STRING }`

---

## Controllers Analysis

### Dashboard Controller (`src/controllers/dashboard.controller.ts`)

#### Endpoints:
1. **getStats()** - Dashboard overview metrics
   - Total active employees
   - Active loans (count + total amount)
   - Pending advances (current month)
   - Monthly salary total with trend calculation
   - Compares current vs previous month for trend percentage

2. **getSalaryTrends()** - N-month salary history
   - Parameter: `months` (default: 6)
   - Returns: Month, total salary, employee count per month
   - Used for salary trend charts

3. **getDepartmentDistribution()** - Employee distribution
   - Shows count per department
   - Calculates percentage distribution
   - Ordered by employee count descending

4. **getAttendanceStats()** - Monthly attendance breakdown
   - Parameter: `months` (default: 6)
   - Returns: Present, Absent, HalfDay/Late counts per month
   - Tracks attendance patterns

5. **getLoanBreakdown()** - Loan status distribution
   - Groups loans by status (ACTIVE, PAID, CLOSED, etc.)
   - Shows count and total amount per status

6. **getRecentActivity()** - Activity feed
   - Parameter: `limit` (default: 10)
   - Returns recent actions/transactions (incomplete in provided file)

### Roles Controller (`src/controllers/roles.controller.ts`)

#### Key Data Model:
```typescript
{
  id: string;
  name: string;
  level: string | null;
  departmentId: string;
  dailyWage: number | null;  // ⚠️ New: For daily wage calculation
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department: {
    id: string;
    name: string;
    description: string | null;
  };
}
```

#### Endpoints (Inferred):
1. **getRoles()** - List all roles (with optional department filter)
   - Joins with departments table
   - Transforms snake_case DB columns to camelCase

2. **getRolesByDepartment(departmentId)** - Roles for specific department
   - Only returns active roles
   - Ordered by name

3. **getRole(id)** - Single role details
   - Includes department information
   - Returns 404 if not found

---

## Route Analysis

### Auth Routes (`src/routes/auth.routes.ts`)
```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - Login (returns token)
GET    /api/auth/me              - Get current user (protected)
POST   /api/auth/logout          - Logout (protected)
```

**Middleware**:
- Uses `authenticate` middleware for protected routes
- Auth controller imported from `auth.controller.sql` (naming suggests SQL-based queries)

### Departments Routes (`src/routes/departments.routes.ts`)
```
GET    /api/departments          - List all departments
GET    /api/departments/:id      - Get specific department
POST   /api/departments          - Create department (admin only)
PUT    /api/departments/:id      - Update department (admin only)
```

**Middleware Chain**:
- `authenticate` - Requires valid token
- `authorize(UserRole.ADMIN)` - Requires admin role
- `auditLog('departments', AuditAction.CREATE/UPDATE)` - Logs actions

### Other Routes (Referenced but Not Detailed)
- `advanceSalaries.routes.ts` - Advance salary CRUD
- `auditLogs.routes.ts` - Query audit logs
- `employees.routes.ts` - Employee management
- `attendance.routes.ts` - Attendance recording
- `loans.routes.ts` - Loan management
- `roles.routes.ts` - Role CRUD
- `salary.routes.ts` - Salary calculation
- `salaryHistory.routes.ts` - Salary history
- `holidays.routes.ts` - Holiday management
- `dashboard.routes.ts` - Dashboard data
- `dailySalaryReleases.routes.ts` - Daily payroll releases

---

## Database Schema References

### Core Tables (From Migration Scripts)

#### 1. **employees**
- `id` (PK)
- `salary_type` ENUM('FIXED', 'DAILY_WAGE')
- `base_salary` DECIMAL
- Address fields: `address_line1`, `address_line2`, `city`, `region`
- Standard employee data (name, email, phone, etc.)
- `is_active` BOOLEAN
- `department_id` (FK)

#### 2. **salary_calculations**
- `id` (PK)
- `employee_id` (FK)
- `month` DATE
- `total_salary` DECIMAL
- Used for salary history and trend calculations
- Supports both FIXED and DAILY_WAGE calculations

#### 3. **employee_salary_history**
- `id` (PK)
- `employee_id` (FK)
- `effective_from` DATE
- `salary_type` ENUM('FIXED', 'DAILY_WAGE')
- `base_salary` DECIMAL
- `reason`, `notes`, `changed_by`, `changed_at`
- Tracks salary changes over time

#### 4. **roles**
- `id` (PK)
- `name` VARCHAR
- `level` VARCHAR (null)
- `department_id` (FK)
- `daily_wage` DECIMAL
- `is_active` BOOLEAN
- **NEW**: Daily wage rate per role

#### 5. **holidays**
- `id` (PK)
- `date` DATE UNIQUE
- `name` VARCHAR
- `type` ENUM('PAID', 'UNPAID')
- `scope` VARCHAR ('GLOBAL', etc.)

#### 6. **loans**
- `id` (PK)
- `employee_id` (FK)
- `loan_amount` DECIMAL
- `status` (ACTIVE, PAID, etc.)
- Indexed by status for breakdowns

#### 7. **attendance**
- `date` DATE
- `employee_id` (FK)
- `status` ENUM('PRESENT', 'ABSENT', 'HALF_DAY')
- Used for attendance stats and salary calculations

#### 8. **departments**
- `id` (PK)
- `name` VARCHAR
- `description` TEXT
- `created_at`, `updated_at` TIMESTAMPS

#### 9. **audit_logs** (Implicit)
- Used throughout for logging all CREATE/UPDATE operations

#### 10. **users**
- `id` (PK)
- Contains user records for authentication/authorization

---

## Missing Utility Files (Critical)

### `utils/db.ts` - Database Query Wrapper
**Used by**: All controllers via `query()`, `queryOne()`, `execute()`, `generateId()`
**Functions called**:
```typescript
query<T>(sql: string, params?: any[]): Promise<T[]>
queryOne<T>(sql: string, params?: any[]): Promise<T | null>
execute(sql: string, params?: any[]): Promise<any>
generateId(): string  // Creates UUID
```

### `middleware/auth.middleware.ts`
**Used by**: All protected routes
**Function**: `authenticate` - Validates Bearer token, attaches user to request
**Type**: `AuthRequest` extends Express Request with user property

### `middleware/rbac.middleware.ts`
**Used by**: Authorization checks
**Function**: `authorize(role: UserRole)` - Checks if user has required role
**Roles**: `UserRole.ADMIN`, presumably `UserRole.EMPLOYEE`

### `middleware/auditLog.middleware.ts`
**Used by**: Create/Update endpoints
**Function**: `auditLog(tableName, action)` - Logs all data modifications
**Actions**: `AuditAction.CREATE`, `AuditAction.UPDATE`

### `utils/auditLog.ts`
**Used by**: auditLog middleware
**Export**: `AuditAction` enum and logging functions

### `types/index.ts`
**Used by**: All controllers
**Exports**:
- `AuthRequest` - Express request with authenticated user
- `UserRole` - Enum for ADMIN, EMPLOYEE roles

---

## Database Migrations

### `RUN_IN_MYSQL_WORKBENCH.sql`
**Purpose**: Initial schema setup
**Changes**:
1. Add address columns to employees
2. Create `employee_salary_history` table
3. Create `holidays` table
4. **Status**: ⚠️ Manual - Must be run in MySQL Workbench

### `UPDATE_TO_DAILY_WAGE.sql`
**Purpose**: Convert employees to daily wage system
**Changes**:
1. Update `salary_type` from FIXED to DAILY_WAGE
2. Clear `base_salary` for daily wage employees
3. **Status**: ⚠️ Migration pending - Not yet applied

### `add_role_levels.sql`
**Purpose**: Setup role levels in roles table
**Status**: ⚠️ Location: `/src/database/add_role_levels.sql`

---

## Security Issues

### 🔴 Critical Security Concerns:
1. **No input validation** - Controllers don't show validation of input parameters
2. **SQL Injection Risk** - While using parameterized queries, no validation shown
3. **Authentication** - Generic error handling doesn't prevent user enumeration
4. **CORS in Development** - Allows all origins in dev (intentional but risky)
5. **Token storage** - Bearer tokens sent in Authorization header (good, but no HTTPS enforcement visible)
6. **Error messages** - Generic 500 errors don't leak information (good practice)

### 🟡 Medium Security Concerns:
1. **Audit logging** - Middleware exists but not fully shown
2. **Rate limiting** - Not visible in app.ts
3. **Request size limits** - Not explicitly configured
4. **Password hashing** - Not visible in auth controller

---

## API Response Patterns

### Success Responses:
```json
{
  "data": []
}
```
or
```json
{
  "data": { "field": "value" }
}
```

### Error Responses:
```json
{
  "error": "Internal server error"
}
```

**Issues**:
- No standardized response envelope with status codes
- No error codes for client-side error handling
- No pagination metadata where applicable

---

## Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| Node.js | Runtime | >=16.0.0 |
| Express | Web framework | >=4.18.0 |
| TypeScript | Language | >=5.0.0 |
| MySQL/MariaDB | Database | >=5.7 |
| dotenv | Environment config | >=16.0.0 |
| cors | CORS middleware | >=2.8.5 |
| cookie-parser | Cookie parsing | >=1.4.6 |

**Expected but not installed**:
- `mysql2/promise` - MySQL driver
- `jsonwebtoken` - JWT for auth
- `bcrypt` - Password hashing
- `axios` - For internal API calls (if needed)
- `uuid` - ID generation
- Test frameworks

---

## Critical Issues Summary

### 🔴 Blocking Production:
1. No `package.json` - Cannot install or run anything
2. No `tsconfig.json` - TypeScript not configured
3. Missing all utility files and middleware
4. Missing auth controller implementation
5. Database migrations not applied

### 🟡 High Priority:
1. Environment variables not configured
2. Database connection not shown
3. No error handling strategy
4. No input validation
5. No rate limiting

### 🟠 Medium Priority:
1. API response standardization needed
2. Comprehensive logging setup needed
3. Performance optimization for dashboard queries
4. Test suite missing
5. API documentation (Swagger/OpenAPI) missing

---

## Required Steps Before Production

### Phase 1: Setup (Days 1-2)
- [ ] Create `package.json` with all dependencies
- [ ] Create `tsconfig.json` configuration
- [ ] Create `.env.example` with all required variables
- [ ] Set up database connection utility
- [ ] Implement authentication middleware and JWT handling

### Phase 2: Core Implementation (Days 3-5)
- [ ] Implement all missing controller files
- [ ] Implement RBAC middleware
- [ ] Implement audit logging middleware
- [ ] Add input validation across all endpoints
- [ ] Implement error handling with proper status codes

### Phase 3: Security & Testing (Days 6-8)
- [ ] Add rate limiting
- [ ] Add request size limits
- [ ] Add helmet security headers
- [ ] Implement comprehensive logging
- [ ] Write unit tests for key functions

### Phase 4: Database & Deployment (Days 9-10)
- [ ] Apply database migrations
- [ ] Test all database queries
- [ ] Set up database backups
- [ ] Configure production environment
- [ ] Deploy to production with monitoring

---

## Database Conversion Notes

### Fixed Salary → Daily Wage Migration
The system is being converted to a **daily wage calculation model** where:
- Employees are tracked by `daily_wage` in their assigned `role`
- Salary = (Daily Wage × Days Worked) + Bonuses - Deductions
- Attendance table tracks daily work status
- Holidays exempt employees from daily calculations
- Advances and loans are deducted from calculated salary

This affects:
- Salary calculation logic (needs to sum by attendance)
- Reporting (trends now by attendance, not fixed salary)
- Employee profiles (show daily rate, not monthly salary)

---

**Last Updated**: April 12, 2026  
**Status**: 🔴 CRITICAL - Cannot run or build  
**Priority**: URGENT - Complete missing files immediately
