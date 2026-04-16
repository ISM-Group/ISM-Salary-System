# Test Database Setup (Schema + Sri Lanka Seed Data)

Use these scripts to quickly prepare a test database for the complete system.

---

## Files

- `server/src/database/setup/01_create_schema.sql`
- `server/src/database/setup/02_seed_sri_lanka_data.sql`

---

## What these scripts create

The scripts create and seed:

- users
- departments
- roles
- employees
- attendance
- loans + loan installments
- advance salaries
- salary calculations
- employee salary history
- holidays (Sri Lanka-relevant)
- audit logs

---

## How to run (MySQL)

> ⚠️ `01_create_schema.sql` resets (drops/recreates) all ISM app tables. Use only on a test database.

1. Create a database (example):

```sql
CREATE DATABASE ism_salary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Run schema script:

```bash
mysql -u root -p ism_salary < server/src/database/setup/01_create_schema.sql
```

3. Run seed script:

```bash
mysql -u root -p ism_salary < server/src/database/setup/02_seed_sri_lanka_data.sql
```

---

## Seeded test credentials

- **Admin username**: `admin`
- **Admin password**: `password`

> Change credentials before any real deployment.

---

## Quick verification checks

```sql
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM attendance;
SELECT COUNT(*) FROM salary_calculations;
SELECT COUNT(*) FROM audit_logs;
```

If all return non-zero values, the test dataset loaded successfully.
