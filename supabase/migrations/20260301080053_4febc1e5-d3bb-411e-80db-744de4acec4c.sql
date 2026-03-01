
ALTER TABLE public.waiter_shifts
ADD COLUMN additional_waiters text[] NOT NULL DEFAULT '{}';

-- Migrate existing second_waiter_name values
UPDATE public.waiter_shifts
SET additional_waiters = ARRAY[second_waiter_name]
WHERE second_waiter_name IS NOT NULL AND second_waiter_name != '';
