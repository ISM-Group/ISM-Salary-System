-- Migration 017: Add salary_type to roles table
-- Roles can now be typed as FIXED (office), DAILY_WAGE (site), or ANY (universal).
-- This allows the employee form to filter roles to only show compatible options,
-- and prevents accidental assignment of site roles to office employees and vice versa.

ALTER TABLE roles
  ADD COLUMN salary_type ENUM('FIXED', 'DAILY_WAGE', 'ANY') NOT NULL DEFAULT 'ANY'
  AFTER department_id;
