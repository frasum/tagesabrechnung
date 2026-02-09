
CREATE TABLE public.advances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow advances access via app"
ON public.advances
FOR ALL
USING (true);
