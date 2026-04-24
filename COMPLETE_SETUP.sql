-- =====================================================
-- ISM Salary System - Complete Schema + Seed Setup
-- =====================================================
-- Comprehensive single script for database initialization
-- Combines schema creation and seed data in one file
-- Safe for test environments (destructive: drops/recreates all ISM tables)
--
-- Usage: Copy entire script into MySQL Workbench and execute
-- or: mysql -u root -p ism_salary < COMPLETE_SETUP.sql
-- =====================================================

SET NAMES utf8mb4;
SET time_zone = '+05:30';

-- =====================================================
-- PART 1: SCHEMA CREATION
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables (test environment only)
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

-- ─────────────────────────────────────────────────────
-- Table: departments
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- Table: users (system admins and managers)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: roles (job titles and daily wage rates)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: employees (all staff records)
-- ─────────────────────────────────────────────────────
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employees_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  INDEX idx_employees_department (department_id),
  INDEX idx_employees_role (role_id),
  INDEX idx_employees_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- Table: attendance (daily presence tracking)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: loans (employee loan records)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: loan_installments (monthly loan payments)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: advance_salaries (salary advance requests)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: salary_calculations (monthly salary records)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: employee_salary_history (salary change tracking)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: holidays (public holidays and special days)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: holiday_employees (holiday-employee assignments)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: daily_salary_releases (daily wage payouts)
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- Table: audit_logs (system activity tracking)
-- ─────────────────────────────────────────────────────
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

-- =====================================================
-- PART 2: SEED DATA
-- =====================================================

-- Clear existing data before seeding
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE employee_salary_history;
TRUNCATE TABLE salary_calculations;
TRUNCATE TABLE advance_salaries;
TRUNCATE TABLE loan_installments;
TRUNCATE TABLE loans;
TRUNCATE TABLE attendance;
TRUNCATE TABLE holiday_employees;
TRUNCATE TABLE holidays;
TRUNCATE TABLE employees;
TRUNCATE TABLE roles;
TRUNCATE TABLE departments;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────
-- Seed: System Users
-- ─────────────────────────────────────────────────────
-- Password for all users: "password"
-- bcrypt hash: $2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2
INSERT INTO users (id, username, password_hash, full_name, role, is_active) VALUES
('user-admin-001', 'admin', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'Nimal Perera', 'ADMIN', TRUE),
('user-hr-001', 'hrmanager', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'Sanduni Jayasinghe', 'ADMIN', TRUE),
('user-mgr-001', 'manager1', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'Kasun Fernando', 'MANAGER', TRUE);

-- ─────────────────────────────────────────────────────
-- Seed: Departments
-- ─────────────────────────────────────────────────────
INSERT INTO departments (id, name, description) VALUES
('dept-hr-001', 'Human Resources', 'Staff administration and policy management'),
('dept-fin-001', 'Finance', 'Payroll, accounts and cash management'),
('dept-ops-001', 'Operations', 'Daily operations and service delivery'),
('dept-log-001', 'Logistics', 'Transport, inventory and supply coordination'),
('dept-sal-001', 'Sales', 'Customer relationships and revenue generation');

-- ─────────────────────────────────────────────────────
-- Seed: Roles with Daily Wage Rates
-- ─────────────────────────────────────────────────────
INSERT INTO roles (id, department_id, name, level, daily_wage, is_active) VALUES
('role-hr-exec-001', 'dept-hr-001', 'HR Executive', 'Mid', 4500.00, TRUE),
('role-fin-off-001', 'dept-fin-001', 'Accounts Officer', 'Mid', 5000.00, TRUE),
('role-ops-asst-001', 'dept-ops-001', 'Operations Assistant', 'Junior', 3800.00, TRUE),
('role-log-coor-001', 'dept-log-001', 'Logistics Coordinator', 'Mid', 4200.00, TRUE),
('role-sales-ex-001', 'dept-sal-001', 'Sales Executive', 'Mid', 4600.00, TRUE),
('role-supervisor-001', 'dept-ops-001', 'Operations Supervisor', 'Senior', 6200.00, TRUE);

-- ─────────────────────────────────────────────────────
-- Seed: Employees
-- ─────────────────────────────────────────────────────
INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, salary_type, base_salary, is_active,
  address_line1, address_line2, city, region
) VALUES
('emp-001', 'EMP001', 'Kasun Fernando', 'kasun.fernando@ism.lk', '+94 77 234 1122', 'dept-ops-001', 'role-ops-asst-001', '2023-06-15', 'DAILY_WAGE', NULL, TRUE, 'No 12, Lake Road', 'Wellawatte', 'Colombo', 'Western'),
('emp-002', 'EMP002', 'Tharushi Wickramasinghe', 'tharushi.w@ism.lk', '+94 71 998 1020', 'dept-hr-001', 'role-hr-exec-001', '2022-09-01', 'DAILY_WAGE', NULL, TRUE, 'No 55, Kandy Road', 'Kadawatha', 'Gampaha', 'Western'),
('emp-003', 'EMP003', 'Dilan Senanayake', 'dilan.s@ism.lk', '+94 76 320 8844', 'dept-fin-001', 'role-fin-off-001', '2021-03-10', 'DAILY_WAGE', NULL, TRUE, 'No 8, Temple Street', NULL, 'Kandy', 'Central'),
('emp-004', 'EMP004', 'Amaya de Silva', 'amaya.desilva@ism.lk', '+94 75 444 2211', 'dept-log-001', 'role-log-coor-001', '2020-12-01', 'DAILY_WAGE', NULL, TRUE, 'No 102, Galle Road', 'Hikkaduwa', 'Galle', 'Southern'),
('emp-005', 'EMP005', 'Sachintha Rajapakse', 'sachintha.r@ism.lk', '+94 70 991 7744', 'dept-sal-001', 'role-sales-ex-001', '2024-01-08', 'DAILY_WAGE', NULL, TRUE, 'No 77, Main Street', NULL, 'Kurunegala', 'North Western'),
('emp-006', 'EMP006', 'Yasas Madushan', 'yasas.m@ism.lk', '+94 74 111 8899', 'dept-ops-001', 'role-supervisor-001', '2019-07-20', 'DAILY_WAGE', NULL, TRUE, 'No 44, Jaffna Road', NULL, 'Jaffna', 'Northern'),
('emp-007', 'EMP007', 'Nadeesha Gunawardena', 'nadeesha.g@ism.lk', '+94 78 510 3020', 'dept-fin-001', 'role-fin-off-001', '2023-02-11', 'DAILY_WAGE', NULL, TRUE, 'No 27, Bank Road', 'Moratuwa', 'Colombo', 'Western'),
('emp-008', 'EMP008', 'Ruwan Pathirana', 'ruwan.p@ism.lk', '+94 72 340 1877', 'dept-log-001', 'role-log-coor-001', '2022-04-05', 'DAILY_WAGE', NULL, TRUE, 'No 90, Beach Road', NULL, 'Matara', 'Southern');

-- ─────────────────────────────────────────────────────
-- Seed: Attendance Records
-- ─────────────────────────────────────────────────────
INSERT INTO attendance (id, employee_id, date, status, notes) VALUES
('att-001', 'emp-001', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-002', 'emp-001', CURDATE() - INTERVAL 4 DAY, 'PRESENT', NULL),
('att-003', 'emp-001', CURDATE() - INTERVAL 3 DAY, 'PRESENT', 'Medical appointment'),
('att-004', 'emp-002', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-005', 'emp-002', CURDATE() - INTERVAL 4 DAY, 'PRESENT', NULL),
('att-006', 'emp-002', CURDATE() - INTERVAL 3 DAY, 'ABSENT', 'Family function'),
('att-007', 'emp-003', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-008', 'emp-003', CURDATE() - INTERVAL 4 DAY, 'PRESENT', NULL),
('att-009', 'emp-004', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-010', 'emp-004', CURDATE() - INTERVAL 4 DAY, 'PRESENT', 'Field travel'),
('att-011', 'emp-005', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-012', 'emp-006', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-013', 'emp-007', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL),
('att-014', 'emp-008', CURDATE() - INTERVAL 5 DAY, 'PRESENT', NULL);

-- ─────────────────────────────────────────────────────
-- Seed: Loans
-- ─────────────────────────────────────────────────────
INSERT INTO loans (id, employee_id, loan_amount, remaining_balance, status) VALUES
('loan-001', 'emp-001', 150000.00, 105000.00, 'ACTIVE'),
('loan-002', 'emp-004', 85000.00, 0.00, 'PAID'),
('loan-003', 'emp-006', 220000.00, 176000.00, 'ACTIVE');

-- ─────────────────────────────────────────────────────
-- Seed: Loan Installments
-- ─────────────────────────────────────────────────────
INSERT INTO loan_installments (id, loan_id, installment_number, due_month, amount, status) VALUES
('inst-001', 'loan-001', 1, DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01'), 15000.00, 'PAID'),
('inst-002', 'loan-001', 2, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), 15000.00, 'PAID'),
('inst-003', 'loan-001', 3, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 15000.00, 'PENDING'),
('inst-004', 'loan-003', 1, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), 22000.00, 'PAID'),
('inst-005', 'loan-003', 2, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 22000.00, 'PENDING');

-- ─────────────────────────────────────────────────────
-- Seed: Advance Salaries
-- ─────────────────────────────────────────────────────
INSERT INTO advance_salaries (id, employee_id, amount, advance_date, slip_photo_url, notes, status) VALUES
('adv-001', 'emp-002', 12000.00, CURDATE() - INTERVAL 12 DAY, 'uploads/adv-001-slip.jpg', 'School fee advance', 'APPROVED'),
('adv-002', 'emp-005', 8000.00, CURDATE() - INTERVAL 8 DAY, NULL, 'Travel advance for field sales', 'APPROVED'),
('adv-003', 'emp-007', 10000.00, CURDATE() - INTERVAL 20 DAY, NULL, 'Family emergency', 'APPROVED');

-- ─────────────────────────────────────────────────────
-- Seed: Salary Calculations
-- ─────────────────────────────────────────────────────
INSERT INTO salary_calculations (
  id, employee_id, month, base_salary, daily_wage_total, bonus, advance_deductions, loan_deductions, total_salary, status, created_at
) VALUES
('sal-001', 'emp-001', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 82000.00, 3000.00, 0.00, 15000.00, 70000.00, 'FINALIZED', NOW() - INTERVAL 20 DAY),
('sal-002', 'emp-002', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 94000.00, 5000.00, 12000.00, 0.00, 87000.00, 'FINALIZED', NOW() - INTERVAL 20 DAY),
('sal-003', 'emp-003', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 102000.00, 7000.00, 0.00, 0.00, 109000.00, 'PAID', NOW() - INTERVAL 20 DAY),
('sal-004', 'emp-004', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 88000.00, 2000.00, 0.00, 10000.00, 80000.00, 'FINALIZED', NOW() - INTERVAL 20 DAY),
('sal-005', 'emp-005', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 84000.00, 4000.00, 8000.00, 0.00, 80000.00, 'DRAFT', NOW() - INTERVAL 20 DAY),
('sal-006', 'emp-006', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 124000.00, 9000.00, 0.00, 22000.00, 111000.00, 'FINALIZED', NOW() - INTERVAL 20 DAY),
('sal-007', 'emp-007', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 98000.00, 3000.00, 10000.00, 0.00, 91000.00, 'PAID', NOW() - INTERVAL 20 DAY),
('sal-008', 'emp-008', DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), NULL, 90000.00, 2500.00, 0.00, 0.00, 92500.00, 'FINALIZED', NOW() - INTERVAL 20 DAY);

-- ─────────────────────────────────────────────────────
-- Seed: Employee Salary History
-- ─────────────────────────────────────────────────────
INSERT INTO employee_salary_history (id, employee_id, effective_from, salary_type, base_salary, reason, notes, changed_by) VALUES
('esh-001', 'emp-001', '2024-01-01', 'DAILY_WAGE', 3500.00, 'Annual wage revision', 'Adjusted to market rate', 'user-admin-001'),
('esh-002', 'emp-003', '2024-01-01', 'DAILY_WAGE', 4800.00, 'Performance increment', NULL, 'user-admin-001'),
('esh-003', 'emp-006', '2024-01-01', 'DAILY_WAGE', 6000.00, 'Promotion to supervisor', 'Moved from assistant role', 'user-hr-001');

-- ─────────────────────────────────────────────────────
-- Seed: Holidays (Sri Lanka Public Holidays 2026)
-- ─────────────────────────────────────────────────────
INSERT INTO holidays (id, date, name, type, scope) VALUES
('hol-001', '2026-01-01', 'New Year Day', 'PAID', 'GLOBAL'),
('hol-002', '2026-02-04', 'Independence Day', 'PAID', 'GLOBAL'),
('hol-003', '2026-04-13', 'Bak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-004', '2026-04-14', 'Sinhala and Tamil New Year Day', 'PAID', 'GLOBAL'),
('hol-005', '2026-05-01', 'May Day', 'PAID', 'GLOBAL'),
('hol-006', '2026-05-25', 'Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-007', '2026-05-26', 'Day Following Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-008', '2026-12-25', 'Christmas Day', 'PAID', 'GLOBAL');

-- ─────────────────────────────────────────────────────
-- Seed: Audit Logs
-- ─────────────────────────────────────────────────────
INSERT INTO audit_logs (
  id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, description, changed_at
) VALUES
('audit-001', 'employees', 'CREATE', 'emp-008', 'user-admin-001', NULL, JSON_OBJECT('employeeId', 'EMP008', 'fullName', 'Ruwan Pathirana'), '127.0.0.1', 'seed-script', 'Initial seed data load', NOW() - INTERVAL 10 DAY),
('audit-002', 'advance_salaries', 'CREATE', 'adv-002', 'user-hr-001', NULL, JSON_OBJECT('amount', 8000, 'employeeId', 'emp-005'), '127.0.0.1', 'seed-script', 'Initial seed data load', NOW() - INTERVAL 8 DAY),
('audit-003', 'loans', 'UPDATE', 'loan-001', 'user-admin-001', JSON_OBJECT('remaining_balance', 120000), JSON_OBJECT('remaining_balance', 105000), '127.0.0.1', 'seed-script', 'Initial seed data load', NOW() - INTERVAL 6 DAY);

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify success)
-- =====================================================

-- Verify table structure
SELECT '=== TABLE CREATION STATUS ===' AS Status;
SELECT 
  'departments' as table_name, COUNT(*) as row_count FROM departments
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'loans', COUNT(*) FROM loans
UNION ALL SELECT 'loan_installments', COUNT(*) FROM loan_installments
UNION ALL SELECT 'advance_salaries', COUNT(*) FROM advance_salaries
UNION ALL SELECT 'salary_calculations', COUNT(*) FROM salary_calculations
UNION ALL SELECT 'employee_salary_history', COUNT(*) FROM employee_salary_history
UNION ALL SELECT 'holidays', COUNT(*) FROM holidays
UNION ALL SELECT 'holiday_employees', COUNT(*) FROM holiday_employees
UNION ALL SELECT 'daily_salary_releases', COUNT(*) FROM daily_salary_releases
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
ORDER BY table_name;

-- Test login credentials
SELECT '=== DEFAULT TEST CREDENTIALS ===' AS Info;
SELECT 'Username: admin, Password: password, Role: ADMIN' AS Login_Info;

-- Sample queries
SELECT '=== EMPLOYEE SAMPLE ===' AS Info;
SELECT employee_id, full_name, email, phone, department_id, is_active FROM employees LIMIT 3;

SELECT '=== DEPARTMENT SUMMARY ===' AS Info;
SELECT d.name, COUNT(e.id) as employee_count 
FROM departments d 
LEFT JOIN employees e ON d.id = e.department_id 
GROUP BY d.id, d.name;

-- =====================================================
-- END OF SETUP SCRIPT
-- =====================================================
