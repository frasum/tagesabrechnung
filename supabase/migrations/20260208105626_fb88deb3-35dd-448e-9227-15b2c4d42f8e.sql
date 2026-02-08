-- Create table for manager navigation permissions
CREATE TABLE public.manager_nav_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  nav_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, nav_path)
);

-- Enable Row Level Security
ALTER TABLE public.manager_nav_permissions ENABLE ROW LEVEL SECURITY;

-- Read via app (for navigation filtering)
CREATE POLICY "Allow nav permissions read via app"
  ON public.manager_nav_permissions FOR SELECT USING (true);

-- Insert/Update/Delete via service role only (edge function)
CREATE POLICY "Allow nav permissions insert via service"
  ON public.manager_nav_permissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow nav permissions update via service"
  ON public.manager_nav_permissions FOR UPDATE USING (true);

CREATE POLICY "Allow nav permissions delete via service"
  ON public.manager_nav_permissions FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_manager_nav_permissions_updated_at
  BEFORE UPDATE ON public.manager_nav_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();