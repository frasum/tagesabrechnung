ALTER TABLE public.waiter_shifts ADD COLUMN staff_id uuid REFERENCES public.staff(id);
ALTER TABLE public.kitchen_shifts ADD COLUMN staff_id uuid REFERENCES public.staff(id);