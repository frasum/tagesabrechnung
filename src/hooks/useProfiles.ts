import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LinkedProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  staff_id: string | null;
}

/**
 * Fetch OAuth profiles that are not yet linked to any staff member.
 * Used by managers to link profiles in the staff dialog.
 */
export function useUnlinkedProfiles() {
  return useQuery({
    queryKey: ['profiles', 'unlinked'],
    queryFn: async () => {
      // Use Edge Function with service role to bypass RLS
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-link-account`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(error.error || 'Fehler beim Laden der Profile');
      }

      return response.json() as Promise<LinkedProfile[]>;
    },
  });
}

/**
 * Fetch OAuth profiles that are linked to a specific staff member.
 * Used to show all OAuth accounts for a staff member in the dialog.
 */
export function useLinkedProfilesForStaff(staffId: string | null) {
  return useQuery({
    queryKey: ['profiles', 'linked', staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-link-account?action=get-linked-for-staff&staff_id=${staffId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(error.error || 'Fehler beim Laden der verknüpften Profile');
      }

      return response.json() as Promise<LinkedProfile[]>;
    },
  });
}

/**
 * Link or unlink an OAuth profile to a staff member via Edge Function.
 * This bypasses RLS since profiles can only be updated by their own users.
 */
export function useAdminLinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staff_id,
      profile_id,
      action,
    }: {
      staff_id: string;
      profile_id: string;
      action: 'link' | 'unlink';
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-link-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            staff_id: action === 'link' ? staff_id : null,
            profile_id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(error.error || 'Verknüpfung fehlgeschlagen');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success(
        variables.action === 'link'
          ? 'OAuth-Konto erfolgreich verknüpft'
          : 'Verknüpfung erfolgreich aufgehoben'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler bei der Verknüpfung');
      console.error('Error linking account:', error);
    },
  });
}
