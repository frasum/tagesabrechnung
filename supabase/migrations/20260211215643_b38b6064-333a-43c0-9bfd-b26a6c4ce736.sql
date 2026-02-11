-- Create function to check for duplicate staff names
CREATE OR REPLACE FUNCTION public.check_duplicate_staff_name(p_name text, p_exclude_id uuid DEFAULT NULL)
RETURNS TABLE("exists" boolean, error_message text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS(
      SELECT 1 FROM staff
      WHERE LOWER(name) = LOWER(p_name)
      AND is_active = true
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
    ),
    CASE
      WHEN EXISTS(
        SELECT 1 FROM staff
        WHERE LOWER(name) = LOWER(p_name)
        AND is_active = true
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
      ) THEN 'Ein aktiver Mitarbeiter mit diesem Namen existiert bereits.'
      ELSE NULL
    END
$$;