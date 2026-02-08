-- Move PIN codes to a separate, protected table
-- This table will ONLY be accessible by the service role (edge functions)

-- Create protected table for PIN codes
CREATE TABLE IF NOT EXISTS public.staff_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.staff(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with DENY ALL for clients
ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated, only service role can access
-- (service role bypasses RLS by default)

-- Migrate existing PINs to the new table
INSERT INTO public.staff_pins (staff_id, pin_code)
SELECT id, COALESCE(pin_code, '0000') FROM public.staff
WHERE id NOT IN (SELECT staff_id FROM public.staff_pins)
ON CONFLICT (staff_id) DO NOTHING;

-- Now remove pin_code from the staff table to prevent any leakage
ALTER TABLE public.staff DROP COLUMN IF EXISTS pin_code;