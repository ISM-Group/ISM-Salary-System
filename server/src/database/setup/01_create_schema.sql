-- ISM Salary System - Full Schema (MySQL 8+)
-- Purpose: Create all tables required by the current application code.
-- Attendance supports only PRESENT and ABSENT statuses.

SET NAMES utf8mb4;
SET time_zone = '+05:30';

-- For test environments, reset all app tables so types/collations are consistent.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS daily_salary_releases;
DROP TABLE IF EXISTS holiday_employees;
DROP TABLE IF EXISTS employee_salary_history;
DROP TABLE IF EXISTS salary_calculations;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS advance_salaries;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role ENUM('ADMIN', 'MANAGER') NOT NULL DEFAULT 'MANAGER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  department_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  level VARCHAR(50) NULL,
  daily_wage DECIMAL(10,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_department_role_level (department_id, name, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL UNIQUE,
  phone VARCHAR(30) NULL,
  department_id CHAR(36) NOT NULL,
  role_id CHAR(36) NULL,
  hire_date DATE NOT NULL,
  salary_type ENUM('FIXED', 'DAILY_WAGE') NOT NULL DEFAULT 'DAILY_WAGE',
  base_salary DECIMAL(10,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  region VARCHAR(100) NULL,
  photo_url VARCHAR(500) NULL,
  photo_key VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employees_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  INDEX idx_employees_department (department_id),
  INDEX idx_employees_role (role_id),
  INDEX idx_employees_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('PRESENT', 'ABSENT') NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date),
  INDEX idx_attendance_date (date),
  INDEX idx_attendance_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loans (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  loan_amount DECIMAL(12,2) NOT NULL,
  remaining_balance DECIMAL(12,2) NOT NULL,
  status ENUM('ACTIVE', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  repayment_mode ENUM('MONTHLY', 'DAILY') NOT NULL DEFAULT 'MONTHLY',
  daily_repayment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loans_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_loans_employee (employee_id),
  INDEX idx_loans_status (status),
  INDEX idx_loans_daily_repayment (employee_id, status, repayment_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_installments (
  id CHAR(36) PRIMARY KEY,
  loan_id CHAR(36) NOT NULL,
  installment_number INT NOT NULL,
  due_month DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('PENDING', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_installments_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  UNIQUE KEY unique_loan_installment_no (loan_id, installment_number),
  INDEX idx_installments_due_month (due_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS advance_salaries (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  advance_date DATE NOT NULL,
  slip_photo_url VARCHAR(255) NULL,
  notes TEXT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_advances_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_advances_employee_date (employee_id, advance_date),
  INDEX idx_advances_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salary_calculations (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  month DATE NOT NULL,
  base_salary DECIMAL(12,2) NULL,
  daily_wage_total DECIMAL(12,2) NULL,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  loan_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_salary DECIMAL(12,2) NOT NULL,
  status ENUM('DRAFT', 'FINALIZED', 'PAID') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_salary_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_salary_employee_month (employee_id, month),
  INDEX idx_salary_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_salary_history (
  id CHAR(36) PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  salary_type ENUM('FIXED', 'DAILY_WAGE') NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT NULL,
  changed_by CHAR(36) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_salary_history_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_salary_history_employee_effective (employee_id, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
  id CHAR(36) PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type ENUM('PAID', 'UNPAID') NOT NULL DEFAULT 'PAID',
  scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL' COMMENT 'GLOBAL = all employees, PER_EMPLOYEE = only assigned employees',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_holiday_date (date),
  INDEX idx_holiday_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holiday_employees (
  id CHAR(36) PRIMARY KEY,
  holiday_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_holiday_employees_holiday FOREIGN KEY (holiday_id) REFERENCES holidays(id) ON DELETE CASCADE,
  CONSTRAINT fk_holiday_employees_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_holiday_employee (holiday_id, employee_id),
  INDEX idx_holiday_employees_holiday (holiday_id),
  INDEX idx_holiday_employees_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  table_name VARCHAR(120) NOT NULL,
  action VARCHAR(50) NOT NULL,
  record_id CHAR(36) NULL,
  changed_by CHAR(36) NULL,
  previous_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_table_action (table_name, action),
  INDEX idx_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
