# ISM Salary System — Documentation Index

**Last Updated**: Synchronized with current codebase  
**System Status**: 🟢 Functional MVP (both client and server build and run)  
**Architecture**: React + Vite (client) / Express + TypeScript + MySQL (server)

---

## Overview

The ISM Salary Management System is a full-stack web application for daily-wage and fixed-salary payroll management, built for a Sri Lanka-based organization. It provides a comprehensive administrative dashboard for managing employees, attendance, loans, advance salaries, salary calculations, and daily salary releases, along with a robust audit trail.

The system consists of two primary components:

- **Client** (`client/`): A React 18 single-page application built with Vite, TypeScript, Tailwind CSS, and TanStack Query. Runs on port 3000.
- **Server** (`server/`): An Express.js REST API built with TypeScript, connecting to MySQL 8+ via `mysql2`. Runs on port 5002.

Both components build successfully and can be run locally with the commands below.

---

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- MySQL 8+ (running, with a database created)

### Server

```bash
cd server
cp .env.example .env        # edit database credentials and JWT secret
npm install
npm run dev                  # starts on http://localhost:5002
```

### Client

```bash
cd client
npm install
npm run dev                  # starts on http://localhost:3000
```

### Database Setup

```bash
mysql -u root -p ism_salary < server/src/database/setup/01_create_schema.sql
mysql -u root -p ism_salary < server/src/database/setup/02_seed_sri_lanka_data.sql
```

Default test credentials after seeding: **admin / password**

---

## Document Guide

| # | Document | Audience | Description |
|---|----------|----------|-------------|
| 1 | **IMPLEMENTATION_UPDATE.md** ⭐ | Everyone | Authoritative status: what was built, how to run, what remains |
| 2 | **CLIENT_ARCHITECTURE.md** | Frontend developers | Client directory structure, components, pages, API layer, routing |
| 3 | **SERVER_ARCHITECTURE.md** | Backend developers | Server structure, middleware, controllers, routes, database schema |
| 4 | **TEST_DATABASE_SETUP.md** | Developers / QA | Schema setup and Sri Lanka seed data instructions |
| 5 | **NON_TECH_USER_GUIDE.md** | HR / Finance / Ops | Plain-language usage guide with monthly workflow |
| 6 | **EXEC_SUMMARY.md** | Project managers | High-level status and remaining production checklist |
| 7 | **PRODUCTION_READINESS.md** | Tech leads | Production hardening checklist and phased action plan |
| 8 | **QUICK_FIX_GUIDE.md** | Reference only | Historical setup templates (most items now implemented) |

**Recommended reading order**: Start with `IMPLEMENTATION_UPDATE.md`, then refer to `CLIENT_ARCHITECTURE.md` or `SERVER_ARCHITECTURE.md` depending on your role.

---

## What Exists Today

### Server (all implemented ✅)

- Express app with full middleware stack (Helmet, rate limiting, CORS, Morgan logging, body parsing)
- JWT authentication with bcrypt password hashing
- Role-based access control (ADMIN and MANAGER roles)
- Zod-based input validation middleware across all routes
- Audit logging middleware with role attribution
- All 13 controllers and 13 route modules
- MySQL connection pool via `mysql2/promise`
- Structured error handling (CORS, JSON parse, and generic errors with dev-only stack traces)
- Health check endpoint (`GET /health`) with database connectivity verification
- Database schema (14 tables) and Sri Lanka seed data
- 8 migration scripts

### Client (all implemented ✅)

- React 18 SPA with Vite build tooling and TypeScript
- TanStack React Query for data fetching
- React Router v6 with protected routes and role-based gating
- AuthContext for JWT token and user state management
- ErrorBoundary component for crash recovery
- LoadingSpinner and PageError UI components
- MainLayout with Sidebar (12 navigation items) and Header
- 15 admin pages and 2 employee self-service pages
- Comprehensive API client (`lib/api.ts`) with 12 service modules
- 8 reusable UI components (button, input, textarea, label, card, table, badge, loading-spinner)
- Tailwind CSS design system with custom color tokens

---

## Remaining Work Before Production

The current codebase is a functional MVP. Before production deployment, complete:

1. **Automated testing** — No test files exist yet; install test framework and write unit/integration tests
2. **CI/CD pipeline** — No GitHub Actions, Dockerfiles, or deployment configs
3. **Database migration execution** — Run schema and seed scripts on the target database
4. **End-to-end validation** — Verify all flows against real schema and business rules
5. **Security audit** — Review JWT token policy, secrets management, and access control
6. **Observability** — Set up logging, error tracking, and performance monitoring
7. **UAT and load testing** — Validate under realistic data volumes

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│              ISM Salary Management System                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   React Client   │◄───────►│  Express Server  │          │
│  │   (Port 3000)    │  HTTP   │   (Port 5002)    │          │
│  │                  │  REST   │                  │          │
│  │ • Vite + TS      │  API    │ • JWT Auth       │          │
│  │ • Tailwind CSS   │         │ • Zod Validation │          │
│  │ • React Query    │         │ • RBAC (roles)   │          │
│  │ • ErrorBoundary  │         │ • Audit Logging  │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                        │                     │
│                            ┌───────────┴──────────┐         │
│                            │   MySQL 8+ Database  │         │
│                            │   14 tables, FK      │         │
│                            │   constraints, UUID   │         │
│                            │   primary keys        │         │
│                            └──────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.3.1 |
| Build Tool | Vite | 5.4.11 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 3.4.16 |
| Data Fetching | TanStack React Query | 5.62.2 |
| HTTP Client | Axios | 1.15.1 |
| Routing | React Router | 6.28.0 |
| Icons | Lucide React | 0.462.0 |
| Backend | Express | 4.21.2 |
| Auth | jsonwebtoken | 9.0.2 |
| Hashing | bcrypt | 5.1.1 |
| Database | MySQL 8+ (mysql2) | 3.11.3 |
| Validation | Zod | 3.23.8 |
| Security | Helmet | 7.1.0 |
| Rate Limiting | express-rate-limit | 7.4.1 |
| Logging | Morgan | 1.10.0 |
| UUID | uuid | 10.0.0 |

---

## File Organization

```
docs/
├── README.md                   (this file — documentation index)
├── IMPLEMENTATION_UPDATE.md    (authoritative current status)
├── EXEC_SUMMARY.md             (executive summary)
├── PRODUCTION_READINESS.md     (production checklist)
├── QUICK_FIX_GUIDE.md          (historical setup templates)
├── CLIENT_ARCHITECTURE.md      (frontend architecture)
├── SERVER_ARCHITECTURE.md      (backend architecture)
├── TEST_DATABASE_SETUP.md      (database setup guide)
└── NON_TECH_USER_GUIDE.md      (business user guide)
```

---

## Deployment Warning

```
Do not deploy directly to production without:
1) validating DB schema compatibility,
2) completing testing and UAT,
3) final security and operations checks.

Current state: runnable MVP, not production-certified.
```
