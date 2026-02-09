
-- Add updated_at column to waiter_shifts (null on insert, set on update)
ALTER TABLE public.waiter_shifts ADD COLUMN updated_at timestamp with time zone DEFAULT NULL;

-- Trigger to auto-set updated_at on UPDATE only
CREATE OR REPLACE FUNCTION public.set_waiter_shift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_waiter_shift_updated_at
BEFORE UPDATE ON public.waiter_shifts
FOR EACH ROW
EXECUTE FUNCTION public.set_waiter_shift_updated_at();
