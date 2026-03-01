
-- Drop the expression-based unique index
DROP INDEX IF EXISTS zt_shifts_employee_date_dept_unique;

-- Set any null departments to empty string
UPDATE zt_shifts SET department = '' WHERE department IS NULL;

-- Add a simple unique constraint that PostgREST can use for upsert
ALTER TABLE zt_shifts ADD CONSTRAINT zt_shifts_emp_date_dept_unique UNIQUE (employee_id, shift_date, department);

-- Set default for department to empty string so it's never null
ALTER TABLE zt_shifts ALTER COLUMN department SET DEFAULT '';
ALTER TABLE zt_shifts ALTER COLUMN department SET NOT NULL;
