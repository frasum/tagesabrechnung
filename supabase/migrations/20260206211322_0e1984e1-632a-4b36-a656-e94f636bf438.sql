-- Add pin_code column to staff table for authentication
ALTER TABLE public.staff 
ADD COLUMN pin_code TEXT;

-- Add index for faster lookups
CREATE INDEX idx_staff_pin_lookup ON public.staff(name, pin_code) WHERE is_active = true;