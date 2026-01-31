-- Check Migration Status
-- Run this to verify if the migration has been applied

-- Check if address columns exist in employees table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME IN ('address_line1', 'address_line2', 'city', 'region')
ORDER BY COLUMN_NAME;

-- Check if employee_salary_history table exists
SELECT 
    TABLE_NAME,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employee_salary_history';

-- Check if holidays table exists
SELECT 
    TABLE_NAME,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'holidays';

-- Summary
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'employees' 
            AND COLUMN_NAME = 'address_line1'
        ) THEN '✓ Address fields exist'
        ELSE '✗ Address fields missing'
    END AS address_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'employee_salary_history'
        ) THEN '✓ Salary history table exists'
        ELSE '✗ Salary history table missing'
    END AS salary_history_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'holidays'
        ) THEN '✓ Holidays table exists'
        ELSE '✗ Holidays table missing'
    END AS holidays_status;




