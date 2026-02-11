
-- Create telegram_settings table (singleton)
CREATE TABLE public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text NOT NULL DEFAULT '',
  chat_id text NOT NULL DEFAULT '',
  excluded_restaurants uuid[] DEFAULT '{}',
  show_pos_total boolean DEFAULT true,
  show_guest_count boolean DEFAULT true,
  show_cash_balance boolean DEFAULT true,
  show_created_by boolean DEFAULT true,
  show_waiters boolean DEFAULT true,
  show_kitchen boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT, INSERT, UPDATE allowed; DELETE not
CREATE POLICY "Allow telegram settings read via app"
  ON public.telegram_settings FOR SELECT USING (true);

CREATE POLICY "Allow telegram settings insert via app"
  ON public.telegram_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow telegram settings update via app"
  ON public.telegram_settings FOR UPDATE USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_telegram_settings_updated_at
  BEFORE UPDATE ON public.telegram_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
