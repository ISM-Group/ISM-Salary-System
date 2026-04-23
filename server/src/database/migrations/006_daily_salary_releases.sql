-- Migration 006: Create daily_salary_releases table
-- Purpose: Track daily salary payouts for daily-wage employees.
-- Each record represents a single day's payout for one employee.
-- Attendance status is always PRESENT (only present employees get daily releases).

CREATE TABLE IF NOT EXISTS daily_salary_releases (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  release_date DATE NOT NULL,
  daily_wage DECIMAL(12,2) NOT NULL DEFAULT 0,
  loan_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'RELEASED') NOT NULL DEFAULT 'PENDING',
  attendance_status ENUM('PRESENT') NOT NULL DEFAULT 'PRESENT',
  released_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_releases_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_releases_user FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_employee_release_date (employee_id, release_date),
  INDEX idx_daily_releases_date (release_date),
  INDEX idx_daily_releases_status (status),
  INDEX idx_daily_releases_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
