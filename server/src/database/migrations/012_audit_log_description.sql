-- Migration 012: Add description column to audit_logs table
-- Purpose: Supports actor role attribution (ADMIN vs MANAGER) and
-- human-readable descriptions in audit trail entries.

ALTER TABLE audit_logs
  ADD COLUMN description VARCHAR(500) NULL AFTER user_agent;
