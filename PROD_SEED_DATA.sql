-- =====================================================
-- ISM Salary System - Initial Seed Data (Production)
-- =====================================================
-- Optional initial data for first-time setup
-- Production-safe: Only INSERT, no DELETE/TRUNCATE
-- 
-- Run this AFTER PROD_DATABASE_SETUP.sql if needed
-- 
-- Usage: mysql -u mrfawz_user -p ISM_salary < PROD_SEED_DATA.sql
-- =====================================================

SET NAMES utf8mb4;
SET time_zone = '+05:30';

-- =====================================================
-- SEED DATA: Initial System Setup
-- =====================================================

-- Check if data already exists before inserting
-- This prevents duplicate key errors on re-runs

-- ─────────────────────────────────────────────────────
-- Departments (run once on first setup)
-- ─────────────────────────────────────────────────────

INSERT INTO departments (id, name, description) 
SELECT 'dept-hr-001', 'Human Resources', 'Staff administration and policy management'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'dept-hr-001');

INSERT INTO departments (id, name, description) 
SELECT 'dept-fin-001', 'Finance', 'Payroll, accounts and cash management'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'dept-fin-001');

INSERT INTO departments (id, name, description) 
SELECT 'dept-ops-001', 'Operations', 'Daily operations and service delivery'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'dept-ops-001');

INSERT INTO departments (id, name, description) 
SELECT 'dept-log-001', 'Logistics', 'Transport, inventory and supply coordination'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'dept-log-001');

INSERT INTO departments (id, name, description) 
SELECT 'dept-sal-001', 'Sales', 'Customer relationships and revenue generation'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'dept-sal-001');

-- ─────────────────────────────────────────────────────
-- System Users (Admin credentials for first login)
-- ─────────────────────────────────────────────────────
-- Default password: "password"
-- bcrypt hash: $2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2

INSERT INTO users (id, username, password_hash, full_name, role, is_active)
SELECT 'user-admin-001', 'admin', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'System Administrator', 'ADMIN', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'user-admin-001');

INSERT INTO users (id, username, password_hash, full_name, role, is_active)
SELECT 'user-hr-001', 'hrmanager', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'HR Manager', 'ADMIN', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'user-hr-001');

-- ─────────────────────────────────────────────────────
-- Job Roles with Daily Wage Rates
-- ─────────────────────────────────────────────────────

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-ops-asst-001', 'dept-ops-001', 'Operations Assistant', 'Junior', 3800.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-ops-asst-001');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-hr-exec-001', 'dept-hr-001', 'HR Executive', 'Mid', 4500.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-hr-exec-001');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-fin-off-001', 'dept-fin-001', 'Accounts Officer', 'Mid', 5000.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-fin-off-001');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-log-coor-001', 'dept-log-001', 'Logistics Coordinator', 'Mid', 4200.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-log-coor-001');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-sales-ex-001', 'dept-sal-001', 'Sales Executive', 'Mid', 4600.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-sales-ex-001');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active)
SELECT 'role-supervisor-001', 'dept-ops-001', 'Operations Supervisor', 'Senior', 6200.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-supervisor-001');

-- ─────────────────────────────────────────────────────
-- Sample Employees (for testing/demo)
-- ─────────────────────────────────────────────────────

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-001', 'EMP001', 'Kasun Fernando', 'kasun.fernando@ism.lk', '+94 77 234 1122', 
       'dept-ops-001', 'role-ops-asst-001', '2023-06-15', 'DAILY_WAGE', NULL, TRUE,
       'No 12, Lake Road', 'Colombo', 'Western'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP001');

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-002', 'EMP002', 'Tharushi Wickramasinghe', 'tharushi.w@ism.lk', '+94 71 998 1020',
       'dept-hr-001', 'role-hr-exec-001', '2022-09-01', 'DAILY_WAGE', NULL, TRUE,
       'No 55, Kandy Road', 'Gampaha', 'Western'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP002');

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-003', 'EMP003', 'Dilan Senanayake', 'dilan.s@ism.lk', '+94 76 320 8844',
       'dept-fin-001', 'role-fin-off-001', '2021-03-10', 'DAILY_WAGE', NULL, TRUE,
       'No 8, Temple Street', 'Kandy', 'Central'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP003');

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-004', 'EMP004', 'Amaya de Silva', 'amaya.desilva@ism.lk', '+94 75 444 2211',
       'dept-log-001', 'role-log-coor-001', '2020-12-01', 'DAILY_WAGE', NULL, TRUE,
       'No 102, Galle Road', 'Galle', 'Southern'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP004');

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-005', 'EMP005', 'Sachintha Rajapakse', 'sachintha.r@ism.lk', '+94 70 991 7744',
       'dept-sal-001', 'role-sales-ex-001', '2024-01-08', 'DAILY_WAGE', NULL, TRUE,
       'No 77, Main Street', 'Kurunegala', 'North Western'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP005');

INSERT INTO employees (
  id, employee_id, full_name, email, phone, department_id, role_id, hire_date, 
  salary_type, base_salary, is_active, address_line1, city, region
)
SELECT 'emp-006', 'EMP006', 'Yasas Madushan', 'yasas.m@ism.lk', '+94 74 111 8899',
       'dept-ops-001', 'role-supervisor-001', '2019-07-20', 'DAILY_WAGE', NULL, TRUE,
       'No 44, Jaffna Road', 'Jaffna', 'Northern'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP006');

-- ─────────────────────────────────────────────────────
-- Sri Lanka Public Holidays 2026 (for reference)
-- ─────────────────────────────────────────────────────

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-001', '2026-01-01', 'New Year Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-01-01');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-002', '2026-02-04', 'Independence Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-02-04');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-003', '2026-04-13', 'Bak Full Moon Poya Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-04-13');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-004', '2026-04-14', 'Sinhala and Tamil New Year Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-04-14');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-005', '2026-05-01', 'May Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-05-01');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-006', '2026-05-25', 'Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-05-25');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-007', '2026-05-26', 'Day Following Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-05-26');

INSERT INTO holidays (id, date, name, type, scope)
SELECT 'hol-008', '2026-12-25', 'Christmas Day', 'PAID', 'GLOBAL'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE date = '2026-12-25');

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ Seed data insertion complete!' AS Status;

SELECT 'Current Record Counts:' AS Summary;
SELECT 
  (SELECT COUNT(*) FROM departments) as departments,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM roles) as roles,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM holidays) as holidays;

SELECT 'Default Credentials:' AS Info;
SELECT 'Username: admin' AS credential;
SELECT 'Username: hrmanager' AS credential;
SELECT 'Password: password' AS credential;

-- =====================================================
-- END OF SEED DATA
-- =====================================================
