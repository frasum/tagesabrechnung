-- Create login_confirmations table for QR-code based admin login verification
CREATE TABLE public.login_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 minutes'),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_ip TEXT,
  
  CONSTRAINT token_not_empty CHECK (length(token) > 0)
);

-- Create index for fast token lookups
CREATE INDEX idx_login_confirmations_token ON public.login_confirmations(token);
CREATE INDEX idx_login_confirmations_staff_id ON public.login_confirmations(staff_id);
CREATE INDEX idx_login_confirmations_expires_at ON public.login_confirmations(expires_at);

-- Enable RLS
ALTER TABLE public.login_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow creation via service role (edge functions)
CREATE POLICY "Service can create login confirmations"
  ON public.login_confirmations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to check confirmation status via token
CREATE POLICY "Anyone can check confirmation by token"
  ON public.login_confirmations
  FOR SELECT
  USING (true);

-- Policy: Service can update confirmations
CREATE POLICY "Service can update login confirmations"
  ON public.login_confirmations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);