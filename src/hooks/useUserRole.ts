import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PermissionLevel } from '@/types/permissions';
import { getAuthToken } from '@/lib/authToken';

interface UserRoleResponse {
  staff_id: string;
  permission_level: PermissionLevel;
}

/**
 * Fetch the permission level for a staff member
 */
export function useUserRole(staffId: string | undefined) {
  return useQuery({
    queryKey: ['user-role', staffId],
    queryFn: async (): Promise<PermissionLevel> => {
      if (!staffId) return 'staff';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${staffId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch user role');
        return 'staff';
      }

      const data: UserRoleResponse = await response.json();
      return data.permission_level;
    },
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update the permission level for a staff member
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, permissionLevel }: { staffId: string; permissionLevel: PermissionLevel; callerStaffId?: string }) => {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            staff_id: staffId,
            permission_level: permissionLevel,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update user role');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-role', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Berechtigungsstufe aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Berechtigungsstufe');
      console.error('Error updating user role:', error);
    },
  });
}
