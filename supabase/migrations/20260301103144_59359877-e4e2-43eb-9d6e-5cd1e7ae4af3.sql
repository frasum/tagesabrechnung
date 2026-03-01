
CREATE TABLE public.payroll_office_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_office_settings ENABLE ROW LEVEL SECURITY;

-- Block all direct client access
CREATE POLICY "No direct read payroll_office_settings" ON public.payroll_office_settings
  FOR SELECT USING (false);
CREATE POLICY "No direct insert payroll_office_settings" ON public.payroll_office_settings
  FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update payroll_office_settings" ON public.payroll_office_settings
  FOR UPDATE USING (false);
CREATE POLICY "No direct delete payroll_office_settings" ON public.payroll_office_settings
  FOR DELETE USING (false);
