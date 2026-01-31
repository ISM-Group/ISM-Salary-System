-- Migration: Add level column to roles table
-- Run this script to add level support to roles

-- Add level column to roles table
ALTER TABLE roles 
ADD COLUMN level VARCHAR(50) NULL AFTER name;

-- Update unique constraint to include level
-- This allows same role name with different levels (e.g., Waiter - Junior, Waiter - Mid, Waiter - Senior)
ALTER TABLE roles 
DROP INDEX unique_department_role;

ALTER TABLE roles 
ADD UNIQUE KEY unique_department_role_level (department_id, name, level);

-- Update existing roles to have NULL level (for backward compatibility)
-- You can manually update specific roles later if needed










