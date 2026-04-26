-- ISM Salary System - MySQL Workbench Login User Seed
-- Run this directly in MySQL Workbench.
-- It creates/updates only login users and does not touch payroll data.

USE `ISM_salary`;

SET NAMES utf8mb4;
SET time_zone = '+05:30';

-- Password for all seeded users: password
-- bcrypt hash: $2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2

START TRANSACTION;

INSERT INTO users (id, username, password_hash, full_name, role, is_active)
VALUES
  ('user-admin-001', 'admin', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'System Administrator', 'ADMIN', TRUE),
  ('user-hr-001', 'hrmanager', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'HR Manager', 'ADMIN', TRUE),
  ('user-mgr-001', 'manager1', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'Manager User', 'MANAGER', TRUE)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = VALUES(role),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

COMMIT;

SELECT username, full_name, role, is_active
FROM users
WHERE username IN ('admin', 'hrmanager', 'manager1')
ORDER BY FIELD(username, 'admin', 'hrmanager', 'manager1');
