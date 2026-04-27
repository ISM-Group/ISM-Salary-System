-- Migration 015: Salary System Overhaul
-- Drops: salary_calculations, daily_salary_releases, holidays, holiday_employees
-- Adds:  role_id to attendance, creates unified salary_releases table
-- Run in this exact order to respect FK constraints.

SET FOREIGN_KEY_CHECKS = 0;

-- ─── Drop old payroll tables ─────────────────────────────────────────────────
DROP TABLE IF EXISTS salary_calculations;
DROP TABLE IF EXISTS daily_salary_releases;

-- ─── Drop holidays module ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS holiday_employees;
DROP TABLE IF EXISTS holidays;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Add role_id to attendance ────────────────────────────────────────────────
-- Records which role the employee worked in that day (for DAILY_WAGE rotation).
-- NULL = employee worked their default registered role.
ALTER TABLE attendance
  ADD COLUMN role_id CHAR(36) NULL AFTER employee_id;

ALTER TABLE attendance
  ADD CONSTRAINT fk_attendance_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE attendance
  ADD INDEX idx_attendance_role (role_id);

-- ─── Create unified salary_releases table ────────────────────────────────────
-- Replaces both salary_calculations and daily_salary_releases.
-- Supports DAILY, WEEKLY, MONTHLY, and CUSTOM periods.
-- released_amount = what was actually handed out (can be < calculated_net).
CREATE TABLE IF NOT EXISTS salary_releases (
  id                  CHAR(36)       PRIMARY KEY,
  employee_id         CHAR(36)       NOT NULL,
  period_start        DATE           NOT NULL,
  period_end          DATE           NOT NULL,
  release_type        ENUM('DAILY','WEEKLY','MONTHLY','CUSTOM') NOT NULL DEFAULT 'CUSTOM',
  salary_type         ENUM('FIXED','DAILY_WAGE')                NOT NULL,
  working_days        INT            NOT NULL DEFAULT 0,
  gross_amount        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  absent_deduction    DECIMAL(12,2)  NOT NULL DEFAULT 0,
  advance_deductions  DECIMAL(12,2)  NOT NULL DEFAULT 0,
  loan_deductions     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  bonus               DECIMAL(12,2)  NOT NULL DEFAULT 0,
  calculated_net      DECIMAL(12,2)  NOT NULL DEFAULT 0,
  released_amount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  status              ENUM('DRAFT','RELEASED') NOT NULL DEFAULT 'DRAFT',
  released_by         CHAR(36)       NULL,
  notes               TEXT           NULL,
  created_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_sr_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_user     FOREIGN KEY (released_by)  REFERENCES users(id)     ON DELETE SET NULL,

  UNIQUE KEY unique_employee_period (employee_id, period_start, period_end),
  INDEX idx_sr_employee (employee_id),
  INDEX idx_sr_period   (period_start, period_end),
  INDEX idx_sr_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
