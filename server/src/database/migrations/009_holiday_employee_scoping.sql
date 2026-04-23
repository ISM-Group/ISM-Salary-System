-- Migration 009: Holiday per-employee scoping
-- Adds a junction table to link holidays to specific employees when scope = 'PER_EMPLOYEE'.
-- GLOBAL holidays apply to all employees; PER_EMPLOYEE holidays only apply to assigned employees.

-- Update holidays scope to support PER_EMPLOYEE value
-- Note: MySQL ENUM modification - add PER_EMPLOYEE as a valid scope
ALTER TABLE holidays MODIFY COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL';

-- Junction table: links holidays to specific employees
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
