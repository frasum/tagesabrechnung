
-- Add new columns to staff table for Sofortmeldung
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS work_start_time time without time zone,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS activity_description text;

-- Create sofortmeldung table
CREATE TABLE public.sofortmeldung (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'entwurf',
  sofortmeldung_required boolean DEFAULT true,
  missing_fields jsonb,
  validated_at timestamptz,
  exported_at timestamptz,
  reported_at timestamptz,
  error_message text,
  export_format text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_name text
);

ALTER TABLE public.sofortmeldung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow sofortmeldung access via app" ON public.sofortmeldung
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Create sofortmeldung_log table
CREATE TABLE public.sofortmeldung_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sofortmeldung_id uuid NOT NULL REFERENCES public.sofortmeldung(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_status text,
  new_status text,
  details jsonb,
  performed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sofortmeldung_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow sofortmeldung_log select" ON public.sofortmeldung_log
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow sofortmeldung_log insert" ON public.sofortmeldung_log
  FOR INSERT TO public WITH CHECK (true);

-- Add updated_at trigger to sofortmeldung
CREATE TRIGGER set_sofortmeldung_updated_at
  BEFORE UPDATE ON public.sofortmeldung
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
