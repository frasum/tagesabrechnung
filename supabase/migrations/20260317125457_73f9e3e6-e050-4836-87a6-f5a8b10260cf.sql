ALTER TABLE public.telegram_settings ADD COLUMN report_time text NOT NULL DEFAULT '06:00';

CREATE OR REPLACE FUNCTION public.update_telegram_cron_schedule(p_time text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hour int;
  v_minute int;
  v_cron text;
  v_cmd text;
BEGIN
  v_hour := EXTRACT(HOUR FROM p_time::time);
  v_minute := EXTRACT(MINUTE FROM p_time::time);
  v_cron := v_minute || ' ' || v_hour || ' * * *';
  v_cmd := E'SELECT net.http_post(\n    url := \'https://hncirnpdfwglagjniapy.supabase.co/functions/v1/send-telegram-summary\',\n    headers := \'{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuY2lybnBkZndnbGFnam5pYXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDcwNzIsImV4cCI6MjA4NTk4MzA3Mn0.j70pDtui3o_dMKqAI2RmJP3FkE7U2t-Ks8i4_CXKuOc"}\'::jsonb,\n    body := \'{}\'::jsonb\n  ) AS request_id;';

  BEGIN
    PERFORM cron.unschedule(1);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'send-telegram-summary-daily',
    v_cron,
    v_cmd
  );
END;
$$;