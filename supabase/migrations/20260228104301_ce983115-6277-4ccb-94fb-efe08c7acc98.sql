
-- Phase 1: Zeiterfassung Schema

-- 1a. Enums
CREATE TYPE public.zt_department AS ENUM ('Küche', 'GL', 'Service');
CREATE TYPE public.period_status AS ENUM ('open', 'locked');

-- 1b. staff-Tabelle erweitern
ALTER TABLE public.staff
  ADD COLUMN perso_nr INTEGER UNIQUE,
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT,
  ADD COLUMN nickname TEXT;

-- 1c. staff_restaurants erweitern
ALTER TABLE public.staff_restaurants
  ADD COLUMN zt_department public.zt_department,
  ADD COLUMN zt_hourly_rate NUMERIC(6,2) DEFAULT 0;

-- 1d. Neue Tabellen

-- scheduling_periods
CREATE TABLE public.scheduling_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id),
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.period_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduling_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow scheduling_periods access via app" ON public.scheduling_periods FOR ALL USING (true) WITH CHECK (true);

-- weeks
CREATE TABLE public.weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.scheduling_periods(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow weeks access via app" ON public.weeks FOR ALL USING (true) WITH CHECK (true);

-- zt_shifts
CREATE TABLE public.zt_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  evening_hours NUMERIC NOT NULL DEFAULT 0,
  night_hours NUMERIC NOT NULL DEFAULT 0,
  sunday_holiday_hours NUMERIC NOT NULL DEFAULT 0,
  is_holiday BOOLEAN NOT NULL DEFAULT false,
  absence_type TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.zt_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow zt_shifts access via app" ON public.zt_shifts FOR ALL USING (true) WITH CHECK (true);

-- bavarian_holidays
CREATE TABLE public.bavarian_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.bavarian_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow bavarian_holidays read via app" ON public.bavarian_holidays FOR SELECT USING (true);

-- payroll_notes
CREATE TABLE public.payroll_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.scheduling_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  vorschuss NUMERIC NOT NULL DEFAULT 0,
  urlaub_tage NUMERIC NOT NULL DEFAULT 0,
  besonderheiten TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow payroll_notes access via app" ON public.payroll_notes FOR ALL USING (true) WITH CHECK (true);

-- daily_revenue
CREATE TABLE public.daily_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  revenue_date DATE NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow daily_revenue access via app" ON public.daily_revenue FOR ALL USING (true) WITH CHECK (true);

-- Unique constraint for daily_revenue
ALTER TABLE public.daily_revenue ADD CONSTRAINT daily_revenue_restaurant_date_unique UNIQUE (restaurant_id, revenue_date);
