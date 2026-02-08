-- Create audit_logs table for tracking changes to waiter shifts
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_by_id uuid,
  changed_by_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  restaurant_id uuid NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (same pattern as other tables)
CREATE POLICY "Allow public access to audit_logs" 
  ON public.audit_logs 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create index for faster queries by record_id and table_name
CREATE INDEX idx_audit_logs_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_restaurant ON public.audit_logs(restaurant_id, created_at DESC);