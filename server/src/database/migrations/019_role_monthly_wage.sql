-- Migration 019: Add monthly_wage to roles table
-- Stores the default monthly salary for FIXED-type roles.
-- Used only as a pre-fill default in the employee form — does not affect
-- payroll calculations (those read from employee.base_salary / salary history).

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS monthly_wage DECIMAL(12,2) NULL DEFAULT NULL
  AFTER daily_wage;
