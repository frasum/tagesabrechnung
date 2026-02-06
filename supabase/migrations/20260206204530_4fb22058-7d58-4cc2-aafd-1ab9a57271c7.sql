-- Create enum for staff roles
CREATE TYPE public.staff_role AS ENUM ('waiter', 'kitchen');

-- Create staff table for employee profiles
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role staff_role NOT NULL,
  phone TEXT,
  hourly_rate NUMERIC DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth yet)
CREATE POLICY "Allow public access to staff" 
ON public.staff 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_staff_role ON public.staff(role);
CREATE INDEX idx_staff_is_active ON public.staff(is_active);