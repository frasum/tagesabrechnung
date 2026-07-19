
-- ============================================
-- STAFF: hide sensitive personal/financial cols
-- ============================================
REVOKE SELECT ON public.staff FROM anon, authenticated;
GRANT SELECT (id, name, role, is_active, first_name, last_name, nickname, participates_in_pool, created_at, updated_at, employment_start, employment_end, personnel_group, employment_type, activity_description, work_start_time)
  ON public.staff TO anon, authenticated;
-- service_role keeps full access
GRANT ALL ON public.staff TO service_role;

-- ============================================
-- TELEGRAM_SETTINGS: admin-only (bot_token secret)
-- ============================================
DROP POLICY IF EXISTS "Allow telegram_settings read via app" ON public.telegram_settings;
DROP POLICY IF EXISTS "Allow telegram_settings insert via app" ON public.telegram_settings;
DROP POLICY IF EXISTS "Allow telegram_settings update via app" ON public.telegram_settings;
DROP POLICY IF EXISTS "Allow telegram_settings access via app" ON public.telegram_settings;

CREATE POLICY "telegram_settings admin read"
  ON public.telegram_settings FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "telegram_settings admin write"
  ON public.telegram_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- AUDIT_LOGS: admin read, service-role insert
-- ============================================
DROP POLICY IF EXISTS "Audit logs read only via app" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert via service" ON public.audit_logs;

CREATE POLICY "audit_logs admin read"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
-- INSERT only via service_role (no policy for anon/authenticated => blocked)

-- ============================================
-- PAYROLL_CALCULATIONS: admin only
-- ============================================
DROP POLICY IF EXISTS "Allow payroll_calculations access via app" ON public.payroll_calculations;
CREATE POLICY "payroll_calculations admin"
  ON public.payroll_calculations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PAYROLL_NOTES: admin only
-- ============================================
DROP POLICY IF EXISTS "Allow payroll_notes access via app" ON public.payroll_notes;
CREATE POLICY "payroll_notes admin"
  ON public.payroll_notes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- SOFORTMELDUNG + LOG: admin only
-- ============================================
DROP POLICY IF EXISTS "Allow sofortmeldung access via app" ON public.sofortmeldung;
CREATE POLICY "sofortmeldung admin"
  ON public.sofortmeldung FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow sofortmeldung_log read via app" ON public.sofortmeldung_log;
DROP POLICY IF EXISTS "Allow sofortmeldung_log insert via app" ON public.sofortmeldung_log;
DROP POLICY IF EXISTS "Allow sofortmeldung_log access via app" ON public.sofortmeldung_log;
CREATE POLICY "sofortmeldung_log admin"
  ON public.sofortmeldung_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- USER_ROLES: own row or admin
-- ============================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "user_roles self or admin read"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR staff_id = (SELECT staff_id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "user_roles admin write"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- MANAGER_NAV_PERMISSIONS: admin read
-- ============================================
DROP POLICY IF EXISTS "Allow nav permissions read via app" ON public.manager_nav_permissions;
CREATE POLICY "manager_nav_permissions admin read"
  ON public.manager_nav_permissions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- STORAGE: payroll-pdfs authenticated only
-- ============================================
DROP POLICY IF EXISTS "Allow payroll-pdfs read" ON storage.objects;
DROP POLICY IF EXISTS "Allow payroll-pdfs upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow payroll-pdfs delete" ON storage.objects;

CREATE POLICY "payroll-pdfs authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payroll-pdfs');
CREATE POLICY "payroll-pdfs authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payroll-pdfs');
CREATE POLICY "payroll-pdfs admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payroll-pdfs' AND public.is_admin(auth.uid()));
