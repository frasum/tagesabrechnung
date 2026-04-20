-- Admin check helper (uses existing get_staff_permission via profiles.staff_id)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.staff_id = p.staff_id
    WHERE p.user_id = _user_id
      AND ur.permission_level = 'admin'::app_permission_level
  )
$$;

-- Static feature priorities
CREATE TABLE public.checklist_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  feature_key text NOT NULL,
  priority text CHECK (priority IN ('green','yellow','red')),
  is_worked_on boolean NOT NULL DEFAULT false,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, feature_key)
);

-- Dynamically registered edge functions
CREATE TABLE public.checklist_edge_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Global notes (singleton row)
CREATE TABLE public.checklist_settings (
  id int PRIMARY KEY DEFAULT 1,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

INSERT INTO public.checklist_settings (id, notes) VALUES (1, '') ON CONFLICT DO NOTHING;

ALTER TABLE public.checklist_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_edge_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS (authenticated admins). Auth.uid() may be null for PIN-logged users
-- but admins use OAuth/Supabase auth, so this is correct.
CREATE POLICY "Admin full access priorities" ON public.checklist_priorities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access edge_functions" ON public.checklist_edge_functions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access settings" ON public.checklist_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed edge functions
INSERT INTO public.checklist_edge_functions (function_name, label) VALUES
  ('admin-link-account', 'Admin Link Account'),
  ('calculate-payroll', 'Calculate Payroll'),
  ('create-login-confirmation', 'Create Login Confirmation'),
  ('elevenlabs-stt', 'ElevenLabs STT'),
  ('elevenlabs-tts', 'ElevenLabs TTS'),
  ('link-account', 'Link Account'),
  ('manage-nav-permissions', 'Manage Nav Permissions'),
  ('manage-user-role', 'Manage User Role'),
  ('manage-webauthn', 'Manage WebAuthn'),
  ('notify-pdf-export', 'Notify PDF Export'),
  ('parse-payroll-pdf', 'Parse Payroll PDF'),
  ('payroll-office-auth', 'Payroll Office Auth'),
  ('payroll-office-data', 'Payroll Office Data'),
  ('restaurant-chat', 'Restaurant Chat'),
  ('send-telegram-summary', 'Send Telegram Summary'),
  ('shared-zt-data', 'Shared ZT Data'),
  ('sync-thaitime-staff', 'Sync Thaitime Staff'),
  ('update-pin', 'Update PIN'),
  ('update-telegram-schedule', 'Update Telegram Schedule'),
  ('validate-pin', 'Validate PIN'),
  ('verify-login-confirmation', 'Verify Login Confirmation'),
  ('verify-session-pin', 'Verify Session PIN'),
  ('webauthn-authenticate', 'WebAuthn Authenticate'),
  ('webauthn-register', 'WebAuthn Register')
ON CONFLICT (function_name) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_priorities;