-- 1. Auth-User anlegen (E-Mail bestätigt, Passwort: FB2026!)
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_staff_id uuid;
  v_encrypted_pw text;
BEGIN
  -- bcrypt hash für Passwort "FB2026!"
  v_encrypted_pw := crypt('FB2026!', gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    'lasse@admin.local',
    v_encrypted_pw,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lasse"}'::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'lasse@admin.local'),
    'email', v_user_id::text,
    now(), now(), now()
  );

  -- 2. Staff-Eintrag (Rolle 'all' für admin)
  INSERT INTO public.staff (name, role, is_active, participates_in_pool)
  VALUES ('Lasse', 'all'::staff_role, true, false)
  RETURNING id INTO v_staff_id;

  -- 3. Admin-Berechtigung
  INSERT INTO public.user_roles (staff_id, permission_level)
  VALUES (v_staff_id, 'admin'::app_permission_level);

  -- 4. Profil verknüpfen (handle_new_user trigger erstellt es; falls nicht, manuell)
  INSERT INTO public.profiles (user_id, email, full_name, staff_id)
  VALUES (v_user_id, 'lasse@admin.local', 'Lasse', v_staff_id)
  ON CONFLICT (user_id) DO UPDATE SET staff_id = EXCLUDED.staff_id;
END $$;