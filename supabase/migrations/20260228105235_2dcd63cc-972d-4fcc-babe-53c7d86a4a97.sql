
-- Add unique constraint for zt_shifts upsert (employee_id, shift_date, department)
CREATE UNIQUE INDEX zt_shifts_employee_date_dept_unique ON public.zt_shifts (employee_id, shift_date, COALESCE(department, ''));
