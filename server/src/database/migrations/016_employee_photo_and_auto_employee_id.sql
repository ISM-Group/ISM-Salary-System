-- Migration 016: Employee photo metadata for Contabo object storage.
-- New employees now receive application-generated employee_id values (EMP###).

ALTER TABLE employees
  ADD COLUMN photo_url VARCHAR(500) NULL AFTER region,
  ADD COLUMN photo_key VARCHAR(500) NULL AFTER photo_url;
