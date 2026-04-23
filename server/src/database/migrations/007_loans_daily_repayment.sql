-- Migration 007: Add daily repayment columns to loans table
-- Purpose: Support daily loan deduction tracking for daily-wage employees.
-- These columns are used by the daily salary release system to calculate
-- per-day loan deductions only on PRESENT days.

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS repayment_mode ENUM('MONTHLY', 'DAILY') NOT NULL DEFAULT 'MONTHLY'
    AFTER status,
  ADD COLUMN IF NOT EXISTS daily_repayment_amount DECIMAL(12,2) NOT NULL DEFAULT 0
    AFTER repayment_mode;

-- Index for quickly finding active daily-repayment loans per employee
CREATE INDEX idx_loans_daily_repayment
  ON loans (employee_id, status, repayment_mode);
