
-- Add night_deep_hours column
ALTER TABLE public.zt_shifts ADD COLUMN night_deep_hours numeric NOT NULL DEFAULT 0;

-- Backfill: calculate night_deep_hours from start_time/end_time
-- night_deep_hours = overlap of shift with 00:00–04:00 window, only when shift starts before midnight
UPDATE public.zt_shifts
SET night_deep_hours = CASE
  -- No times recorded or absence
  WHEN start_time IS NULL OR end_time IS NULL THEN 0
  -- Shift does NOT cross midnight (end > start), no deep night hours
  WHEN (CAST(end_time AS time)) > (CAST(start_time AS time)) THEN 0
  -- Shift crosses midnight: deep night = min(end_time_minutes, 240) / 60
  ELSE ROUND(LEAST(
    (EXTRACT(HOUR FROM CAST(end_time AS time)) * 60 + EXTRACT(MINUTE FROM CAST(end_time AS time))),
    240
  ) / 60.0, 2)
END
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;
