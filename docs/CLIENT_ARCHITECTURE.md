# ISM Salary System — Client Architecture

## Overview

The client is a React 18 single-page application built with Vite, TypeScript, and Tailwind CSS. It provides a role-based administrative dashboard for the ISM Salary Management System. Data fetching is handled via TanStack React Query, and routing uses React Router v6 with protected route wrappers and role-based gating. The client communicates with the Express backend via an Axios-based API layer.

**Build status**: ✅ Builds and runs successfully  
**Dev server**: `npm run dev` on port 3000  
**Production build**: `npm run build` outputs to `dist/`

---

## Directory Structure

```
client/
├── index.html                       # Vite HTML entry point
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.node.json               # TS config for Vite/Node tooling
├── vite.config.ts                   # Vite build configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── src/
    ├── main.tsx                     # React entry point (QueryClient, BrowserRouter, AuthProvider, ErrorBoundary)
    ├── App.tsx                      # Route definitions with ProtectedRoute and RoleRoute wrappers
    ├── index.css                    # Tailwind global styles and design tokens
    ├── vite-env.d.ts                # Vite environment type declarations
    ├── contexts/
    │   └── AuthContext.tsx           # JWT auth state, login/logout, token persistence
    ├── hooks/
    │   ├── use-mobile.ts            # Mobile viewport detection hook
    │   └── use-toast.ts             # Toast notification hook
    ├── lib/
    │   ├── api.ts                   # Axios API client with 12 service modules
    │   └── utils.ts                 # Utility functions (cn() for classNames)
    ├── components/
    │   ├── ErrorBoundary.tsx         # React Error Boundary with retry UI
    │   ├── dashboard/
    │   │   └── StatCard.tsx          # Dashboard metric card with trend indicators
    │   ├── layout/
    │   │   ├── Header.tsx            # Sticky header with title, search, and user section
    │   │   ├── MainLayout.tsx        # Sidebar + Header + content area wrapper
    │   │   └── Sidebar.tsx           # 12-item navigation with role-based visibility
    │   └── ui/
    │       ├── badge.tsx             # Status badge with variants
    │       ├── button.tsx            # Button with multiple variants
    │       ├── card.tsx              # Card container component
    │       ├── input.tsx             # Input field component
    │       ├── label.tsx             # Form label component
    │       ├── loading-spinner.tsx   # LoadingSpinner, PageLoading, PageError components
    │       ├── table.tsx             # Table with Header/Body/Row/Cell sub-components
    │       └── textarea.tsx          # Textarea component
    └── pages/
        ├── auth/
        │   └── LoginPage.tsx         # Login form with credential submission
        ├── shared/
        │   └── PlaceholderPage.tsx    # Generic placeholder page
        ├── employee/
        │   ├── EmployeeDashboardPage.tsx       # Employee self-service dashboard
        │   └── EmployeeAttendanceEntryPage.tsx  # Employee attendance submission
        └── admin/
            ├── AdminDashboardPage.tsx           # Admin analytics dashboard
            ├── EmployeesPage.tsx                # Employee list with search and filters
            ├── EmployeeProfilePage.tsx          # Full employee profile with aggregated data
            ├── EmployeeFormPage.tsx             # Create/edit employee form
            ├── EmployeeAttendanceCalendarPage.tsx # Per-employee attendance calendar
            ├── AttendanceEntryPage.tsx           # Daily attendance recording
            ├── DepartmentsPage.tsx               # Department CRUD
            ├── RolesPage.tsx                     # Role management with department association
            ├── LoansPage.tsx                     # Loan management with installment views
            ├── AdvanceSalariesPage.tsx            # Advance salary with approval workflow
            ├── DailySalaryReleasesPage.tsx        # Daily release generation and bulk release
            ├── HolidaysPage.tsx                   # Holiday CRUD with GLOBAL/PER_EMPLOYEE scoping
            ├── SalaryCalculatePage.tsx             # Salary computation with deduction breakdown
            ├── SalaryHistoryPage.tsx               # Salary calculation history view
            └── AuditLogsPage.tsx                   # Audit log viewer with passkey gate
```

---

## Application Bootstrap

The application entry point is `src/main.tsx`, which sets up the following provider hierarchy:

```
React.StrictMode
  └── ErrorBoundary (top-level crash boundary)
       └── QueryClientProvider (TanStack React Query)
            └── BrowserRouter (React Router)
                 └── AuthProvider (JWT auth context)
                      └── App (route definitions)
```

The React Query client is configured with `retry: 1` and `refetchOnWindowFocus: false` as defaults. The top-level `ErrorBoundary` catches unhandled component errors and displays a user-friendly error message with a "Try Again" button.

---

## Authentication and Routing

### AuthContext

The `AuthContext` (`src/contexts/AuthContext.tsx`) manages authentication state. It stores the JWT token and user object in `localStorage` and exposes the following interface:

- `user`: The currently authenticated user (id, username, full_name, role)
- `token`: The JWT token string
- `isAuthenticated`: Boolean derived from token and user presence
- `login(username, password)`: Calls the backend login endpoint, stores token and user
- `logout()`: Calls backend logout, clears localStorage, resets state

On mount, the context validates the existing token by calling `GET /api/auth/me`. If validation fails, the token and user are cleared.

User roles are `ADMIN` and `MANAGER`. The role enum aligns with the backend `UserRole` enum and the database schema `ENUM('ADMIN', 'MANAGER')`.

### Route Structure

Routes are defined in `App.tsx` with two wrapper components:

- **ProtectedRoute**: Redirects unauthenticated users to `/login`. Wraps each route's content in an `ErrorBoundary`.
- **RoleRoute**: Conditionally gates routes by role. When `adminOnly` is true, non-ADMIN users are redirected to `/admin/dashboard`.

The following routes are defined:

| Path | Page | Access |
|------|------|--------|
| `/login` | LoginPage | Public (redirects to dashboard if authenticated) |
| `/admin/dashboard` | AdminDashboardPage | ADMIN, MANAGER |
| `/admin/employees` | EmployeesPage | ADMIN, MANAGER |
| `/admin/employees/new` | EmployeeFormPage | ADMIN, MANAGER |
| `/admin/employees/:id` | EmployeeProfilePage | ADMIN, MANAGER |
| `/admin/employees/:id/edit` | EmployeeFormPage | ADMIN only |
| `/admin/employees/:id/attendance/calendar` | EmployeeAttendanceCalendarPage | ADMIN, MANAGER |
| `/admin/attendance/entry` | AttendanceEntryPage | ADMIN, MANAGER |
| `/admin/departments` | DepartmentsPage | ADMIN, MANAGER |
| `/admin/roles` | RolesPage | ADMIN, MANAGER |
| `/admin/loans` | LoansPage | ADMIN, MANAGER |
| `/admin/advance-salaries` | AdvanceSalariesPage | ADMIN, MANAGER |
| `/admin/daily-releases` | DailySalaryReleasesPage | ADMIN, MANAGER |
| `/admin/holidays` | HolidaysPage | ADMIN, MANAGER |
| `/admin/salary/calculate` | SalaryCalculatePage | ADMIN, MANAGER |
| `/admin/salary/history` | SalaryHistoryPage | ADMIN, MANAGER |
| `/admin/audit-logs` | AuditLogsPage | ADMIN only |
| `/employee/dashboard` | EmployeeDashboardPage | All authenticated |
| `/employee/attendance` | EmployeeAttendanceEntryPage | All authenticated |

ADMIN and MANAGER users are routed to `/admin/dashboard` on login. Other users are routed to `/employee/dashboard`. Catch-all routes under `/admin/*` redirect to `/admin/dashboard`, and `/employee/*` to `/employee/dashboard`.

---

## API Layer

The API client (`src/lib/api.ts`) creates a centralized Axios instance configured with:

- **Base URL**: `VITE_API_URL` environment variable (default: `http://localhost:5001/api`)
- **Request interceptor**: Auto-attaches `Bearer <token>` from localStorage
- **Response interceptor**: On 401 errors (when not on the login page), clears auth state and redirects to `/login`
- **Credentials**: `withCredentials: true` for CORS cookie support

The following 12 API service modules are exported:

| Module | Endpoints |
|--------|-----------|
| `authAPI` | register, login, logout, getCurrentUser |
| `dashboardAPI` | getStats, getSalaryTrends, getDepartmentDistribution, getAttendanceStats, getLoanBreakdown, getRecentActivity |
| `employeesAPI` | getAll, getById, create, update, delete, getProfile |
| `salaryHistoryAPI` | getByEmployee, create |
| `holidaysAPI` | getAll, getById, create, update, delete, updateEmployees, getByEmployee |
| `attendanceAPI` | getAll, create, update, getDaily, getEmployeeAttendanceCalendar |
| `loansAPI` | getAll, getById, create, update, updateInstallment, settle, extend |
| `advanceSalariesAPI` | getAll, create, getByEmployee, updateStatus |
| `salaryAPI` | calculate, getHistory |
| `departmentsAPI` | getAll, getById, create, update, delete |
| `rolesAPI` | getAll, getByDepartment, getById, create, update, delete |
| `auditLogsAPI` | getAll, verifyPasskey |
| `dailyReleasesAPI` | generate, getAll, getByEmployee, release, releaseAll, deleteRelease |

---

## UI Components

### Error Handling

The `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) is a React class component that catches unhandled errors in its children's component tree. It displays a styled error message with the error details and a "Try Again" button that resets the error state. An optional `fallback` prop allows custom error UI.

### Loading and Error States

The `loading-spinner.tsx` module exports three components:

- **LoadingSpinner**: An animated spinner with configurable size (`sm`, `md`, `lg`) and optional loading text
- **PageLoading**: A full-page centered loading indicator
- **PageError**: An error state with a message and optional retry button

### Layout

- **MainLayout**: Wraps content with the Sidebar, Header, and a main content area. Accepts `title` and `description` props.
- **Sidebar**: Renders 12 navigation items with `lucide-react` icons. The "Audit Logs" item is hidden from MANAGER users. Displays user info and a logout button. Hidden on screens smaller than `lg` breakpoint.
- **Header**: Sticky header showing page title and description, desktop-only search bar, notification bell, and user profile section.

### Reusable UI

Eight reusable components are available under `src/components/ui/`:

| Component | Description |
|-----------|-------------|
| `Button` | Button with variants (default, destructive, outline, secondary, ghost, link) and sizes |
| `Input` | Styled input field |
| `Textarea` | Styled textarea |
| `Label` | Form label |
| `Card` | Card container with Header, Title, Description, Content, and Footer sub-components |
| `Table` | Data table with Header, Body, Row, Head, and Cell sub-components |
| `Badge` | Status badge with variant support |
| `LoadingSpinner` | Animated loading indicator |

---

## Styling

The application uses Tailwind CSS with a custom design system defined in `src/index.css`:

- **Primary**: `215 28% 17%` (dark blue)
- **Accent**: `173 80% 40%` (teal)
- **Success**: `142 76% 36%` (green)
- **Destructive**: `0 84% 60%` (red)
- **Warning**: `38 92% 50%` (orange)

Sidebar-specific tokens provide a distinct dark theme for the navigation. Custom animations include `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, and `animate-pulse-slow`.

---

## Environment Configuration

The client uses Vite environment variables (prefixed with `VITE_`):

```env
VITE_API_URL=http://localhost:5001/api
```

If `VITE_API_URL` is not set, the API client defaults to `http://localhost:5001/api`.

---

## Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI framework | 18.3.1 |
| React Router | Client-side routing | 6.28.0 |
| TypeScript | Type safety | 5.7.2 |
| Tailwind CSS | Utility-first styling | 3.4.16 |
| Vite | Build tooling and dev server | 5.4.11 |
| Axios | HTTP client | 1.15.1 |
| TanStack Query | Server-state management | 5.62.2 |
| Lucide React | Icon library | 0.462.0 |
| clsx | Conditional class merging | 2.1.1 |
