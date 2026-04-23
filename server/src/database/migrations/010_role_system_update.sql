-- Migration 010: Role System Update (EMPLOYEE → MANAGER)
--
-- HISTORY: This migration originally converted the users.role ENUM from
-- ('ADMIN', 'EMPLOYEE') to ('ADMIN', 'MANAGER') and updated existing rows.
--
-- As of the latest schema consolidation, the base schema (01_create_schema.sql)
-- already defines the role column as ENUM('ADMIN', 'MANAGER'). This migration
-- is retained as a no-op marker so migration-tracking tools do not re-apply it.
--
-- The ISM Salary System only has two user roles:
--   ADMIN   – Full access (approve, edit, delete, audit logs)
--   MANAGER – Data entry access (create, view — no approvals/deletions)
--
-- There is no employee-facing login; employees are managed records, not users.

-- No-op: base schema already uses ENUM('ADMIN', 'MANAGER')
SELECT 'Migration 010 — role system update already applied in base schema' AS info;
