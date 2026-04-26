-- ISM Salary System - Login User Bootstrap Seed
-- Purpose: create only login users for an existing empty database.
-- Safe to rerun: updates the seeded users if they already exist.
-- Prerequisite: users table exists from 01_create_schema.sql or PROD_DATABASE_SETUP.sql.

SET NAMES utf8mb4;
SET time_zone = '+05:30';

-- Password for all seeded users: password
-- bcrypt hash: $2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2

INSERT INTO users (id, username, password_hash, full_name, role, is_active)
VALUES
  ('user-admin-001', 'admin', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'System Administrator', 'ADMIN', TRUE),
  ('user-hr-001', 'hrmanager', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'HR Manager', 'ADMIN', TRUE),
  ('user-mgr-001', 'manager1', '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2', 'Manager User', 'MANAGER', TRUE)
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = VALUES(role),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

SELECT username, full_name, role, is_active
FROM users
WHERE username IN ('admin', 'hrmanager', 'manager1')
ORDER BY FIELD(username, 'admin', 'hrmanager', 'manager1');
