-- Enum für App-Berechtigungsstufen
CREATE TYPE public.app_permission_level AS ENUM ('staff', 'manager', 'admin');

-- Berechtigungs-Tabelle (separate Tabelle gemäß Best Practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  permission_level app_permission_level NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id)
);

-- RLS aktivieren
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Lesezugriff über App (Service Role)
CREATE POLICY "Allow user_roles read via app"
ON public.user_roles
FOR SELECT
USING (true);

-- RLS Policy: Insert via Service Role
CREATE POLICY "Allow user_roles insert via service"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Update via Service Role  
CREATE POLICY "Allow user_roles update via service"
ON public.user_roles
FOR UPDATE
USING (true);

-- RLS Policy: Delete via Service Role
CREATE POLICY "Allow user_roles delete via service"
ON public.user_roles
FOR DELETE
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Security Definer Function für sichere Rollenabfrage
CREATE OR REPLACE FUNCTION public.get_staff_permission(p_staff_id UUID)
RETURNS app_permission_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permission_level FROM user_roles WHERE staff_id = p_staff_id),
    'staff'::app_permission_level
  )
$$;

-- Bestehende aktive Mitarbeiter erhalten Standard-Rolle 'staff'
INSERT INTO public.user_roles (staff_id, permission_level)
SELECT id, 'staff'::app_permission_level
FROM public.staff
WHERE is_active = true
ON CONFLICT (staff_id) DO NOTHING;