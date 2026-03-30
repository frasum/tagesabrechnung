CREATE TABLE public.payroll_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL,
  sfn_mode text NOT NULL DEFAULT 'simple',
  date_from date NOT NULL,
  date_to date NOT NULL,
  label text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_name text
);

ALTER TABLE public.payroll_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow payroll_calculations access via app"
  ON public.payroll_calculations FOR ALL USING (true) WITH CHECK (true);