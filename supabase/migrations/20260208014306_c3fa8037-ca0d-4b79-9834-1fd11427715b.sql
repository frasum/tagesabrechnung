-- Create junction table for staff-restaurant assignments
CREATE TABLE public.staff_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(staff_id, restaurant_id)
);

-- Enable RLS
ALTER TABLE public.staff_restaurants ENABLE ROW LEVEL SECURITY;

-- Allow public access (matching existing pattern)
CREATE POLICY "Allow public access to staff_restaurants"
ON public.staff_restaurants
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_staff_restaurants_staff_id ON public.staff_restaurants(staff_id);
CREATE INDEX idx_staff_restaurants_restaurant_id ON public.staff_restaurants(restaurant_id);