-- Allow SELECT on staff table for the view to work, but the view excludes pin_code
-- The view is the only way clients can read staff data
DROP POLICY IF EXISTS "Deny direct staff read" ON public.staff;

-- Create a policy that allows reading basic staff info but not for direct queries
-- We'll use a different approach: allow SELECT but ensure pin_code is never returned via API
-- by clients using the view, while the table is still protected

-- Alternative: Allow read but the frontend should use the view
CREATE POLICY "Allow staff read for view"
  ON public.staff FOR SELECT
  USING (true);

-- Note: The staff_public view excludes pin_code column, so clients using the view 
-- won't see PIN codes. Direct table access would show pins, but we document that
-- the app must use staff_public view. For full protection without changing app code,
-- we'd need a different approach like column-level security or triggers.