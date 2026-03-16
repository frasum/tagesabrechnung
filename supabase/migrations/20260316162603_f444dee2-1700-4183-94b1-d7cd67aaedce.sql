
-- 1. Skills table
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow skills access via app" ON public.skills FOR ALL USING (true) WITH CHECK (true);

-- 2. Employee skills (n:m)
CREATE TABLE public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  UNIQUE (staff_id, skill_id)
);
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow employee_skills access via app" ON public.employee_skills FOR ALL USING (true) WITH CHECK (true);

-- 3. Shift assignments
CREATE TABLE public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  department text NOT NULL,
  shift_date date NOT NULL,
  start_time time,
  end_time time,
  assigned_skill_id uuid REFERENCES public.skills(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_date)
);
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow shift_assignments access via app" ON public.shift_assignments FOR ALL USING (true) WITH CHECK (true);

-- 4. Absences
CREATE TABLE public.absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  absence_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow absences access via app" ON public.absences FOR ALL USING (true) WITH CHECK (true);

-- 5. Staff extension
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS contracted_hours_per_month numeric DEFAULT NULL;

-- 6. Seed skills
INSERT INTO public.skills (name, category, color, sort_order) VALUES
  ('VS', 'kitchen', '#ef4444', 1),
  ('PASS', 'kitchen', '#f97316', 2),
  ('SPÜLEN', 'kitchen', '#eab308', 3),
  ('CO', 'kitchen', '#22c55e', 4),
  ('SERVICE', 'service', '#3b82f6', 5),
  ('BAR', 'service', '#8b5cf6', 6),
  ('GL', 'gl', '#ec4899', 7);
