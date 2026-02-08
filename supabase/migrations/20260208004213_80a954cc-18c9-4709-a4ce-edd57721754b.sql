-- Create table for bank deposits
CREATE TABLE public.bank_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing pattern)
CREATE POLICY "Allow public access to bank_deposits"
ON public.bank_deposits
FOR ALL
USING (true)
WITH CHECK (true);