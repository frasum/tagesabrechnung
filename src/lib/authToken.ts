import { supabase } from '@/integrations/supabase/client';

const AUTH_STORAGE_KEY = 'spicery_auth_user';

/**
 * Get the current Supabase Auth session token for edge function calls.
 * Returns the access_token if an OAuth session exists, otherwise the anon key.
 */
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

/**
 * Get the staff_id of the currently logged-in user (PIN or OAuth).
 * Used as x-staff-id header for edge functions when no OAuth JWT is available.
 */
export function getCallerStaffId(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.staffId || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Build auth headers for edge function calls.
 * Includes both Authorization (JWT or anon key) and x-staff-id (for PIN-based auth fallback).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  const staffId = getCallerStaffId();
  if (staffId) {
    headers['x-staff-id'] = staffId;
  }
  return headers;
}
