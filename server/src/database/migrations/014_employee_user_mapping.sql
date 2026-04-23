-- Migration 014: Add user_id column to employees table for self-service mapping
-- This links each employee record to a user account so employees can view
-- their own records through the self-service portal.

ALTER TABLE employees ADD COLUMN user_id VARCHAR(36) DEFAULT NULL AFTER id;
ALTER TABLE employees ADD INDEX idx_employees_user_id (user_id);

-- Note: To map existing employees to user accounts, run:
-- UPDATE employees e
--   INNER JOIN users u ON (u.full_name = e.full_name OR u.username = e.email)
--   SET e.user_id = u.id;
