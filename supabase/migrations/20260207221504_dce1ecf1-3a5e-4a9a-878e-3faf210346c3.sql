-- Add participates_in_pool column to waiter_shifts table
ALTER TABLE public.waiter_shifts 
ADD COLUMN participates_in_pool boolean NOT NULL DEFAULT true;