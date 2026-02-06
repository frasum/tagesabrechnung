-- Add kassiert_brutto column to waiter_shifts table
-- This field tracks the actual gross amount collected by the waiter
-- (independent of POS sales, due to table transfers between waiters)

ALTER TABLE public.waiter_shifts 
ADD COLUMN kassiert_brutto numeric DEFAULT 0;