-- Migration 008: Add status column to advance_salaries table
-- Purpose: Allow approval workflow for salary advances. The daily salary
-- release system only deducts advances that have been APPROVED.

ALTER TABLE advance_salaries
  ADD COLUMN IF NOT EXISTS status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED'
    AFTER notes;

-- Index for filtering advances by status
CREATE INDEX idx_advances_status
  ON advance_salaries (status);
