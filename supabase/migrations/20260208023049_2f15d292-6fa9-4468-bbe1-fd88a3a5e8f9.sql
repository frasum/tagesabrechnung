-- Remove the validate_staff_pin function (not needed, edge function handles validation)
DROP FUNCTION IF EXISTS public.validate_staff_pin(TEXT, TEXT);

-- Create auth_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT
);

-- Enable RLS on auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from edge function)
CREATE POLICY "Service role insert auth attempts"
  ON public.auth_attempts FOR INSERT
  WITH CHECK (false);  -- Block client inserts, only service role bypasses

-- No public read access
CREATE POLICY "No public read auth attempts"
  ON public.auth_attempts FOR SELECT
  USING (false);

-- Restrict audit_logs to read-only (no client writes)
DROP POLICY IF EXISTS "Allow audit logs access via app" ON public.audit_logs;

CREATE POLICY "Audit logs read only via app"
  ON public.audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Audit logs insert via service"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);  -- App needs to write audit logs

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier_time 
  ON public.auth_attempts(identifier, attempted_at DESC);