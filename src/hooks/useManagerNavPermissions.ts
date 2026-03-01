import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/authToken';

interface AllPermissions {
  [staffId: string]: string[];
}

// Hook to fetch all manager permissions (for admin page)
export function useAllManagerNavPermissions() {
  return useQuery({
    queryKey: ['manager-nav-permissions-all'],
    queryFn: async (): Promise<AllPermissions> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-nav-permissions`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch all manager nav permissions');
        return {};
      }

      const data = await response.json();
      return data.permissions || {};
    },
  });
}

// Hook to fetch permissions for a specific staff member
export function useManagerNavPermissions(staffId: string | undefined) {
  return useQuery({
    queryKey: ['manager-nav-permissions', staffId],
    queryFn: async (): Promise<string[]> => {
      if (!staffId) return [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-nav-permissions?staff_id=${staffId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch manager nav permissions');
        return [];
      }

      const data = await response.json();
      return data.paths || [];
    },
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to save permissions for a manager
export function useSaveManagerNavPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, paths }: { staffId: string; paths: string[]; callerStaffId?: string }) => {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-nav-permissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ staff_id: staffId, paths }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save manager nav permissions');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manager-nav-permissions-all'] });
      queryClient.invalidateQueries({ queryKey: ['manager-nav-permissions', variables.staffId] });
    },
  });
}
