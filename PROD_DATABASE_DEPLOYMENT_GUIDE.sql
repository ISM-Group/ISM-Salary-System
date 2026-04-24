-- =====================================================
-- ISM Salary System - Production Database Deployment
-- =====================================================
-- Complete guide for running SQL setup on production
--
-- Database Credentials:
--   Host: 127.0.0.1
--   Port: 3306
--   User: mrfawz_user
--   Password: MrFawz2026
--   Database: ISM_salary
-- =====================================================

-- =====================================================
-- STEP 1: CREATE DATABASE (if not exists)
-- =====================================================

-- Run this as root or admin user on VPS:

CREATE DATABASE IF NOT EXISTS ISM_salary 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create user with limited permissions:

CREATE USER IF NOT EXISTS 'mrfawz_user'@'127.0.0.1' IDENTIFIED BY 'MrFawz2026';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, 
      CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, 
      SHOW VIEW ON ISM_salary.* TO 'mrfawz_user'@'127.0.0.1';

FLUSH PRIVILEGES;

-- =====================================================
-- STEP 2: RUN SCHEMA SETUP (creates tables safely)
-- =====================================================

-- On VPS, run schema creation:
-- mysql -h 127.0.0.1 -u mrfawz_user -pMrFawz2026 ISM_salary < PROD_DATABASE_SETUP.sql

-- This script:
--   ✅ Creates all 14 tables with IF NOT EXISTS
--   ✅ Preserves existing data (no DROP/TRUNCATE)
--   ✅ Creates indexes and foreign keys
--   ✅ Safe to run multiple times
--   ✅ UTC+5:30 timezone (Sri Lanka)

-- =====================================================
-- STEP 3: RUN SEED DATA (optional, for first setup)
-- =====================================================

-- Optional: Add initial data on first deployment:
-- mysql -h 127.0.0.1 -u mrfawz_user -pMrFawz2026 ISM_salary < PROD_SEED_DATA.sql

-- This script:
--   ✅ Inserts only if records don't exist (using WHERE NOT EXISTS)
--   ✅ Safe to run multiple times without duplicates
--   ✅ Includes default admin user: admin / password
--   ✅ Creates 6 sample employees for testing
--   ✅ Adds Sri Lanka 2026 public holidays

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================

-- Check all tables exist:
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'ISM_salary'
ORDER BY TABLE_NAME;

-- Verify schema integrity:
SELECT COUNT(CONSTRAINT_NAME) as foreign_keys
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'ISM_salary' AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check if seed data loaded:
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Departments', COUNT(*) FROM departments
UNION ALL SELECT 'Roles', COUNT(*) FROM roles
UNION ALL SELECT 'Employees', COUNT(*) FROM employees
UNION ALL SELECT 'Holidays', COUNT(*) FROM holidays;

-- =====================================================
-- STEP 5: POST-DEPLOYMENT CHECKS
-- =====================================================

-- 1. Verify default login exists:
SELECT username, full_name, role, is_active 
FROM users WHERE username = 'admin';

-- 2. Check timezone is set correctly:
SELECT @@time_zone, @@system_time_zone;

-- 3. Verify character set:
SELECT @@character_set_client, @@character_set_database;

-- 4. Check data integrity:
SELECT 
  (SELECT COUNT(*) FROM employees) as total_employees,
  (SELECT COUNT(*) FROM departments) as total_departments,
  (SELECT COUNT(*) FROM roles) as total_roles;

-- =====================================================
-- COMMON OPERATIONS (Production Safe)
-- =====================================================

-- Add a new employee:
-- INSERT INTO employees (id, employee_id, full_name, department_id, role_id, 
--                       hire_date, salary_type) 
-- VALUES (UUID(), 'EMP999', 'John Doe', 'dept-ops-001', 'role-ops-asst-001', 
--         CURDATE(), 'DAILY_WAGE');

-- Add holidays:
-- INSERT INTO holidays (id, date, name, type, scope)
-- VALUES (UUID(), '2026-06-01', 'Custom Holiday', 'PAID', 'GLOBAL');

-- Update user password (use bcrypt hash):
-- UPDATE users SET password_hash = '[bcrypt_hash]' WHERE username = 'admin';

-- Deactivate user:
-- UPDATE users SET is_active = FALSE WHERE username = 'username';

-- =====================================================
-- ROLLBACK PROCEDURES
-- =====================================================

-- If something goes wrong, you have options:

-- Option 1: Drop specific tables and re-run setup:
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE audit_logs;
-- DROP TABLE daily_salary_releases;
-- [etc - drop specific problematic tables]
-- SET FOREIGN_KEY_CHECKS = 1;
-- Then re-run: mysql -h 127.0.0.1 -u mrfawz_user -pMrFawz2026 ISM_salary < PROD_DATABASE_SETUP.sql

-- Option 2: Full database reset (PRODUCTION: BE CAREFUL):
-- DROP DATABASE ISM_salary;
-- Then restart from STEP 1

-- =====================================================
-- DEPLOYMENT CHECKLIST
-- =====================================================

-- [ ] MySQL 5.7+ installed and running
-- [ ] Database user 'mrfawz_user' created with password 'MrFawz2026'
-- [ ] ISM_salary database created
-- [ ] PROD_DATABASE_SETUP.sql copied to VPS
-- [ ] PROD_SEED_DATA.sql copied to VPS (optional)
-- [ ] Run schema setup script
-- [ ] Verify tables created: SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='ISM_salary';
-- [ ] Run seed data script (optional)
-- [ ] Verify data: SELECT COUNT(*) FROM users;
-- [ ] Test backend connection to database
-- [ ] Test default login (admin/password)
-- [ ] Verify in application UI
-- [ ] Take database backup
-- [ ] Update .env file with DATABASE_HOST=api.salary.ismgroups.lk or 127.0.0.1
-- [ ] Update application configuration
-- [ ] Deploy application
-- [ ] Monitor logs for errors

-- =====================================================
-- MONITORING
-- =====================================================

-- Check database size:
SELECT 
  table_schema,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'ISM_salary'
GROUP BY table_schema;

-- Monitor query performance:
SET SESSION sql_mode='STRICT_TRANS_TABLES';

-- Check slow queries:
SHOW VARIABLES LIKE 'slow_query%';

-- Recent changes to tables:
SELECT * FROM audit_logs 
ORDER BY changed_at DESC 
LIMIT 50;

-- =====================================================
-- PRODUCTION TIPS
-- =====================================================

-- 1. BACKUPS
--    Before running any SQL on production:
--    mysqldump -h 127.0.0.1 -u mrfawz_user -pMrFawz2026 ISM_salary > backup_$(date +%Y%m%d_%H%M%S).sql

-- 2. TEST FIRST
--    Always test SQL scripts on staging database first

-- 3. TIMEZONE
--    Ensure MySQL timezone is set to +05:30 (Sri Lanka)
--    In my.cnf: default-time-zone='+05:30'
--    Or per session: SET time_zone = '+05:30';

-- 4. CHARACTER ENCODING
--    All tables use utf8mb4 for full Unicode support
--    Verify: SHOW CREATE TABLE users;

-- 5. FOREIGN KEYS
--    Enabled by default. Disable only if needed for migration:
--    SET FOREIGN_KEY_CHECKS = 0; ... SET FOREIGN_KEY_CHECKS = 1;

-- 6. MONITORING
--    Set up log rotation:
--    - MySQL error log: /var/log/mysql/error.log
--    - Slow query log: /var/log/mysql/slow-query.log
--    - Application logs: /home/deploy/ism-server/logs/

-- 7. MAINTENANCE
--    Regular tasks:
--    OPTIMIZE TABLE users, employees, salary_calculations;
--    ANALYZE TABLE users, employees, salary_calculations;
--    CHECK TABLE users, employees, salary_calculations;

-- =====================================================
-- DATABASE SCHEMA OVERVIEW
-- =====================================================

-- Tables (14 total):
-- 1. departments       - Company departments/teams
-- 2. users            - System administrators and managers
-- 3. roles            - Job titles and daily wage rates
-- 4. employees        - All staff members (FIXED or DAILY_WAGE)
-- 5. attendance       - Daily presence tracking
-- 6. loans            - Employee loan records
-- 7. loan_installments - Monthly loan payment tracking
-- 8. advance_salaries  - Salary advance requests
-- 9. salary_calculations - Monthly salary records (DRAFT/FINALIZED/PAID)
-- 10. employee_salary_history - Salary change audit trail
-- 11. holidays        - Public holidays and special days
-- 12. holiday_employees - Holiday assignments (if needed per-employee)
-- 13. daily_salary_releases - Daily wage payouts (for daily wage employees)
-- 14. audit_logs      - System activity and data change logs

-- Key Fields:
-- - salary_type: ENUM('FIXED', 'DAILY_WAGE') - determines how salary is calculated
-- - status: Various ENUM fields for workflow (DRAFT, FINALIZED, PAID, PENDING, etc.)
-- - created_at/updated_at: Automatic timestamps
-- - Indexes on frequently queried columns for performance

-- =====================================================
-- END OF DEPLOYMENT GUIDE
-- =====================================================
