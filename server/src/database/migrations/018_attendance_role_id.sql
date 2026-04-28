-- Migration 018: Add role_id to attendance table (standalone)
-- This extracts the attendance schema change from migration 015 so it can be
-- applied independently without running the full salary_releases overhaul.
-- Safe to run even if 015 has already been run — IF NOT EXISTS prevents errors.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS role_id CHAR(36) NULL DEFAULT NULL AFTER employee_id;

ALTER TABLE attendance
  ADD CONSTRAINT IF NOT EXISTS fk_attendance_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_role_id ON attendance(role_id);
