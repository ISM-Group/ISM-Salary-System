-- Migration 011: Remove HALF_DAY from attendance and daily_salary_releases
-- Purpose: Simplify attendance to only PRESENT/ABSENT statuses.
-- Any existing HALF_DAY records are converted to PRESENT before altering the ENUM.

-- Step 1: Convert any existing HALF_DAY attendance records to PRESENT
UPDATE attendance SET status = 'PRESENT' WHERE status = 'HALF_DAY';

-- Step 2: Alter the attendance table to remove HALF_DAY from the ENUM
ALTER TABLE attendance MODIFY COLUMN status ENUM('PRESENT', 'ABSENT') NOT NULL;

-- Step 3: Convert any existing HALF_DAY daily_salary_releases records to PRESENT
UPDATE daily_salary_releases SET attendance_status = 'PRESENT' WHERE attendance_status = 'HALF_DAY';

-- Step 4: Alter the daily_salary_releases table to remove HALF_DAY from the ENUM
ALTER TABLE daily_salary_releases MODIFY COLUMN attendance_status ENUM('PRESENT') NOT NULL DEFAULT 'PRESENT';
