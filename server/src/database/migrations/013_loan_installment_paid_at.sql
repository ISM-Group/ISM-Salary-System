-- Migration 013: Add paid_at column to loan_installments
-- Purpose: Record the exact timestamp when a monthly installment was marked PAID.
--          Used by the early-settle endpoint and by future reporting queries.

ALTER TABLE loan_installments
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL DEFAULT NULL
    AFTER status;
