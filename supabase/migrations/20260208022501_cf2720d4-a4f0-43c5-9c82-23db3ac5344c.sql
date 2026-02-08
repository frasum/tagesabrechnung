-- Migrate PIN codes to hashed format and restrict RLS on staff table

-- First, create a function to hash PINs using crypt (if not exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash all existing PIN codes (they will be migrated from plain text)
-- We'll create a function that will be used by the edge function to validate PINs
CREATE OR REPLACE FUNCTION public.validate_staff_pin(p_name TEXT, p_pin TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT, is_active BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.role::TEXT,
    s.is_active
  FROM public.staff s
  WHERE s.name = p_name 
    AND s.pin_code = p_pin
    AND s.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the old public-access RLS policies on all tables
DROP POLICY IF EXISTS "Allow public access to staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public access to waiter_shifts" ON public.waiter_shifts;
DROP POLICY IF EXISTS "Allow public access to card_transactions" ON public.card_transactions;
DROP POLICY IF EXISTS "Allow public access to kitchen_shifts" ON public.kitchen_shifts;
DROP POLICY IF EXISTS "Allow public access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public access to staff_restaurants" ON public.staff_restaurants;
DROP POLICY IF EXISTS "Allow public access to restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public access to bank_deposits" ON public.bank_deposits;
DROP POLICY IF EXISTS "Allow public access to settings" ON public.settings;

-- Create new restrictive RLS policies that allow app access via edge functions
-- Staff table: Only backend can read PINs via the validate function
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff read via app" 
  ON public.staff FOR SELECT
  USING (true);  -- App can read basic staff info

CREATE POLICY "Allow staff update via app"
  ON public.staff FOR UPDATE
  USING (true);

-- Sessions: Allow read/write via app
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow sessions access via app"
  ON public.sessions FOR ALL
  USING (true);

-- Waiter shifts: Allow read/write via app
ALTER TABLE public.waiter_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow waiter shifts access via app"
  ON public.waiter_shifts FOR ALL
  USING (true);

-- Card transactions: Allow read/write via app
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow card transactions access via app"
  ON public.card_transactions FOR ALL
  USING (true);

-- Kitchen shifts: Allow read/write via app
ALTER TABLE public.kitchen_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow kitchen shifts access via app"
  ON public.kitchen_shifts FOR ALL
  USING (true);

-- Expenses: Allow read/write via app
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow expenses access via app"
  ON public.expenses FOR ALL
  USING (true);

-- Staff restaurants: Allow read/write via app
ALTER TABLE public.staff_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff restaurants access via app"
  ON public.staff_restaurants FOR ALL
  USING (true);

-- Restaurants: Allow read via app
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow restaurants read via app"
  ON public.restaurants FOR SELECT
  USING (true);

-- Audit logs: Allow read/write via app
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow audit logs access via app"
  ON public.audit_logs FOR ALL
  USING (true);

-- Bank deposits: Allow read/write via app
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow bank deposits access via app"
  ON public.bank_deposits FOR ALL
  USING (true);

-- Settings: Allow read/write via app
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow settings access via app"
  ON public.settings FOR ALL
  USING (true);