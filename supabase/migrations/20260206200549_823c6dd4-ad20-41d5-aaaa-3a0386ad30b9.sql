-- Daily sessions table (main table for each day's reconciliation)
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL UNIQUE,
  spicery_counter DECIMAL(10,2) DEFAULT 0,
  pos_total DECIMAL(10,2) DEFAULT 0,
  terminal_1_total DECIMAL(10,2) DEFAULT 0,
  terminal_2_total DECIMAL(10,2) DEFAULT 0,
  ordersmart_revenue DECIMAL(10,2) DEFAULT 0,
  gustoco_revenue DECIMAL(10,2) DEFAULT 0,
  orderhut_revenue DECIMAL(10,2) DEFAULT 0,
  wolt_revenue DECIMAL(10,2) DEFAULT 0,
  ubereats_revenue DECIMAL(10,2) DEFAULT 0,
  vouchers_sold DECIMAL(10,2) DEFAULT 0,
  vouchers_redeemed DECIMAL(10,2) DEFAULT 0,
  finedine_vouchers DECIMAL(10,2) DEFAULT 0,
  opentabs_deduction DECIMAL(10,2) DEFAULT 0,
  vorschuss DECIMAL(10,2) DEFAULT 0,
  einladung DECIMAL(10,2) DEFAULT 0,
  sonstige_einnahme DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waiter shifts table
CREATE TABLE public.waiter_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  waiter_name TEXT NOT NULL,
  pos_sales DECIMAL(10,2) DEFAULT 0,
  card_total DECIMAL(10,2) DEFAULT 0,
  hilf_mahl DECIMAL(10,2) DEFAULT 0,
  open_invoices DECIMAL(10,2) DEFAULT 0,
  cash_handed_in DECIMAL(10,2) DEFAULT 0,
  differenz DECIMAL(10,2) GENERATED ALWAYS AS (pos_sales + hilf_mahl - open_invoices - card_total) STORED,
  kitchen_tip DECIMAL(10,2) GENERATED ALWAYS AS (pos_sales * 0.02) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Card transactions for each waiter
CREATE TABLE public.card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  waiter_shift_id UUID REFERENCES public.waiter_shifts(id) ON DELETE CASCADE NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('EC', 'Visa', 'Amex', 'Maestro')),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kitchen staff shifts for tip distribution
CREATE TABLE public.kitchen_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  staff_name TEXT NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  hours_worked DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN shift_end > shift_start 
      THEN EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600
      ELSE EXTRACT(EPOCH FROM (shift_end + INTERVAL '24 hours' - shift_start)) / 3600
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now - can add auth later)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (can be restricted with auth later)
CREATE POLICY "Allow public access to sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to waiter_shifts" ON public.waiter_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to card_transactions" ON public.card_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to kitchen_shifts" ON public.kitchen_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to sessions table
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();