-- Update all employees to daily wage (Safe Mode Compatible)
-- This works even with MySQL safe update mode enabled

-- Option 1: Update using a subquery with a key column
UPDATE employees 
SET salary_type = 'DAILY_WAGE' 
WHERE salary_type = 'FIXED' 
  AND id IN (SELECT id FROM (SELECT id FROM employees WHERE salary_type = 'FIXED') AS temp);

-- Option 2: Update with LIMIT (if you know how many records)
-- UPDATE employees SET salary_type = 'DAILY_WAGE' WHERE salary_type = 'FIXED' LIMIT 1000;

-- Clear base_salary for daily wage employees
UPDATE employees 
SET base_salary = NULL 
WHERE salary_type = 'DAILY_WAGE' 
  AND base_salary IS NOT NULL
  AND id IN (SELECT id FROM (SELECT id FROM employees WHERE salary_type = 'DAILY_WAGE' AND base_salary IS NOT NULL) AS temp);

-- Verify the changes
SELECT 
    salary_type,
    COUNT(*) as count,
    COUNT(CASE WHEN base_salary IS NOT NULL THEN 1 END) as with_base_salary
FROM employees
GROUP BY salary_type;



