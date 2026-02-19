
ALTER TABLE public.restaurants ADD COLUMN ordersmart_in_takeaway boolean NOT NULL DEFAULT true;

-- YUM auf false setzen
UPDATE public.restaurants SET ordersmart_in_takeaway = false WHERE slug = 'yum';
