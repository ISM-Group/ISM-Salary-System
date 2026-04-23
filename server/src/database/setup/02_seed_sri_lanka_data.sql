-- ISM Salary System - Seed Data (Sri Lanka oriented)
-- Prerequisite: 01_create_schema.sql
-- Safe for local testing; clears transactional tables before reseeding.

SET NAMES utf8mb4;
SET time_zone = '+05:30';
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE employee_salary_history;
TRUNCATE TABLE salary_calculations;
TRUNCATE TABLE advance_salaries;
TRUNCATE TABLE loan_installments;
TRUNCATE TABLE loans;
TRUNCATE TABLE attendance;
TRUNCATE TABLE employees;
TRUNCATE TABLE roles;
TRUNCATE TABLE departments;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- Password for all seeded users: password
-- bcrypt hash: $2b$10$CwTycUXWue0Thq9StjUM0uJ8rQ5M8r.EzY4xXHzkwmo7aX6ixkmK.
INSERT INTO users (id, username, password_hash, full_name, role, is_active) VALUES
('user-admin-001', 'admin', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQ5M8r.EzY4xXHzkwmo7aX6ixkmK.', 'Nimal Perera', 'ADMIN', TRUE),
('user-hr-001', 'hrmanager', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQ5M8r.EzY4xXHzkwmo7aX6ixkmK.', 'Sanduni Jayasinghe', 'ADMIN', TRUE),
('user-mgr-001', 'manager1', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQ5M8r.EzY4xXHzkwmo7aX6ixkmK.', 'Kasun Fernando', 'MANAGER', TRUE);

INSERT INTO departments (id, name, description) VALUES
('dept-hr-001', 'Human Resources', 'Staff administration and policy management'),
('dept-fin-001', 'Finance', 'Payroll, accounts and cash management'),
('dept-ops-001', 'Operations', 'Daily operations and service delivery'),
('dept-log-001', 'Logistics', 'Transport, inventory and supply coordination'),
('dept-sal-001', 'Sales', 'Customer relationships and revenue generation');

INSERT INTO roles (id, department_id, name, level, daily_wage, is_active) VALUES
('role-hr-exec-001', 'dept-hr-001', 'HR Executive', 'Mid', 4500.00, TRUE),
('role-fin-off-001', 'dept-fin-001', 'Accounts Officer', 'Mid', 5000.00, TRUE),
('role-ops-asst-001', 'dept-ops-001', 'Operations Assistant', 'Junior', 3800.00, TRUE),
('role-log-coor-001', 'dept-log-001', 'Logistics Coordinator', 'Mid', 4200.00, TRUE),
('role-sales-ex-001', 'dept-sal-001', 'Sales Executive', 'Mid', 4600.00, TRUE),
('role-supervisor-001', 'dept-ops-001', 'Operations Supervisor', 'Senior', 6200.00, TRUE);

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

INSERT INTO loans (id, employee_id, loan_amount, remaining_balance, status) VALUES
('loan-001', 'emp-001', 150000.00, 105000.00, 'ACTIVE'),
('loan-002', 'emp-004', 85000.00, 0.00, 'PAID'),
('loan-003', 'emp-006', 220000.00, 176000.00, 'ACTIVE');

INSERT INTO loan_installments (id, loan_id, installment_number, due_month, amount, status) VALUES
('inst-001', 'loan-001', 1, DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01'), 15000.00, 'PAID'),
('inst-002', 'loan-001', 2, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), 15000.00, 'PAID'),
('inst-003', 'loan-001', 3, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 15000.00, 'PENDING'),
('inst-004', 'loan-003', 1, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), 22000.00, 'PAID'),
('inst-005', 'loan-003', 2, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 22000.00, 'PENDING');

INSERT INTO advance_salaries (id, employee_id, amount, advance_date, slip_photo_url, notes) VALUES
('adv-001', 'emp-002', 12000.00, CURDATE() - INTERVAL 12 DAY, 'uploads/adv-001-slip.jpg', 'School fee advance'),
('adv-002', 'emp-005', 8000.00, CURDATE() - INTERVAL 8 DAY, NULL, 'Travel advance for field sales'),
('adv-003', 'emp-007', 10000.00, CURDATE() - INTERVAL 20 DAY, NULL, 'Family emergency');

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

INSERT INTO employee_salary_history (id, employee_id, effective_from, salary_type, base_salary, reason, notes, changed_by) VALUES
('esh-001', 'emp-001', '2024-01-01', 'DAILY_WAGE', 3500.00, 'Annual wage revision', 'Adjusted to market rate', 'user-admin-001'),
('esh-002', 'emp-003', '2024-01-01', 'DAILY_WAGE', 4800.00, 'Performance increment', NULL, 'user-admin-001'),
('esh-003', 'emp-006', '2024-01-01', 'DAILY_WAGE', 6000.00, 'Promotion to supervisor', 'Moved from assistant role', 'user-hr-001');

INSERT INTO holidays (id, date, name, type, scope) VALUES
('hol-001', '2026-01-01', 'New Year Day', 'PAID', 'GLOBAL'),
('hol-002', '2026-02-04', 'Independence Day', 'PAID', 'GLOBAL'),
('hol-003', '2026-04-13', 'Bak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-004', '2026-04-14', 'Sinhala and Tamil New Year Day', 'PAID', 'GLOBAL'),
('hol-005', '2026-05-01', 'May Day', 'PAID', 'GLOBAL'),
('hol-006', '2026-05-25', 'Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-007', '2026-05-26', 'Day Following Vesak Full Moon Poya Day', 'PAID', 'GLOBAL'),
('hol-008', '2026-12-25', 'Christmas Day', 'PAID', 'GLOBAL');

INSERT INTO audit_logs (
  id, table_name, action, record_id, changed_by, previous_data, new_data, ip_address, user_agent, changed_at
) VALUES
('audit-001', 'employees', 'CREATE', 'emp-008', 'user-admin-001', NULL, JSON_OBJECT('employeeId', 'EMP008', 'fullName', 'Ruwan Pathirana'), '127.0.0.1', 'seed-script', NOW() - INTERVAL 10 DAY),
('audit-002', 'advance_salaries', 'CREATE', 'adv-002', 'user-hr-001', NULL, JSON_OBJECT('amount', 8000, 'employeeId', 'emp-005'), '127.0.0.1', 'seed-script', NOW() - INTERVAL 8 DAY),
('audit-003', 'loans', 'UPDATE', 'loan-001', 'user-admin-001', JSON_OBJECT('remaining_balance', 120000), JSON_OBJECT('remaining_balance', 105000), '127.0.0.1', 'seed-script', NOW() - INTERVAL 6 DAY);
