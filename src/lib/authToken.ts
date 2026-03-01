import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current Supabase Auth session token for edge function calls.
 * Returns the access_token if an OAuth session exists, otherwise the anon key.
 */
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}
