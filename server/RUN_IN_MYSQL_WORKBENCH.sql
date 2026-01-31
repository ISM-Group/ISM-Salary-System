-- =====================================================
-- ISM Salary System - Database Migration
-- Copy and paste this entire file into MySQL Workbench
-- =====================================================

-- Step 1: Add address fields to employees table
ALTER TABLE employees
ADD COLUMN address_line1 VARCHAR(255) NULL AFTER phone,
ADD COLUMN address_line2 VARCHAR(255) NULL AFTER address_line1,
ADD COLUMN city VARCHAR(255) NULL AFTER address_line2,
ADD COLUMN region VARCHAR(255) NULL AFTER city;

-- Step 2: Create employee_salary_history table
CREATE TABLE IF NOT EXISTS employee_salary_history (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  salary_type ENUM('FIXED', 'DAILY_WAGE') NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL,
  notes TEXT NULL,
  reason TEXT NOT NULL,
  changed_by VARCHAR(36) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_esh_employee_effective (employee_id, effective_from)
);

-- Step 3: Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(36) PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type ENUM('PAID', 'UNPAID') NOT NULL DEFAULT 'PAID',
  scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_holiday_date (date),
  INDEX idx_holiday_type (type)
);

-- =====================================================
-- Verification Queries (run these to check if it worked)
-- =====================================================

-- Check if address columns were added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME IN ('address_line1', 'address_line2', 'city', 'region')
ORDER BY COLUMN_NAME;

-- Check if new tables exist
SHOW TABLES LIKE 'employee_salary_history';
SHOW TABLES LIKE 'holidays';

-- View table structures
DESCRIBE employee_salary_history;
DESCRIBE holidays;

-- =====================================================
-- Optional: Set all employees to daily wage (if needed)
-- =====================================================
-- Uncomment these lines if you want all salaries to be day-based:

-- UPDATE employees SET salary_type = 'DAILY_WAGE' WHERE salary_type = 'FIXED';
-- UPDATE employees SET base_salary = NULL WHERE salary_type = 'DAILY_WAGE';



