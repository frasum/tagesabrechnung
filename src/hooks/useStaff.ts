import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/authToken';

export type StaffRole = 'waiter' | 'kitchen' | 'both' | 'gl' | 'waiter_gl' | 'kitchen_gl' | 'all';

export interface RoleFlags {
  service: boolean;
  kitchen: boolean;
  gl: boolean;
}

export function enumToRoles(role: StaffRole): RoleFlags {
  return {
    service: ['waiter', 'both', 'waiter_gl', 'all'].includes(role),
    kitchen: ['kitchen', 'both', 'kitchen_gl', 'all'].includes(role),
    gl: ['gl', 'waiter_gl', 'kitchen_gl', 'all'].includes(role),
  };
}

export function rolesToEnum(s: boolean, k: boolean, g: boolean): StaffRole {
  if (s && k && g) return 'all';
  if (s && k) return 'both';
  if (s && g) return 'waiter_gl';
  if (k && g) return 'kitchen_gl';
  if (s) return 'waiter';
  if (k) return 'kitchen';
  if (g) return 'gl';
  return 'waiter'; // fallback
}

export function hasRole(role: StaffRole, check: 'waiter' | 'kitchen' | 'gl'): boolean {
  const flags = enumToRoles(role);
  if (check === 'waiter') return flags.service;
  if (check === 'kitchen') return flags.kitchen;
  return flags.gl;
}

export interface StaffRestaurant {
  restaurant_id: string;
  zt_department: string | null;
  restaurants: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface RestaurantAssignment {
  restaurant_id: string;
  zt_department: string | null;
}

export interface LinkedProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export type PermissionLevel = 'staff' | 'manager' | 'admin';

export interface Staff {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  perso_nr?: number | null;
  role: StaffRole;
  hourly_rate: number | null;
  notes: string | null;
  is_active: boolean | null;
  participates_in_pool: boolean;
  created_at: string;
  updated_at: string;
  staff_restaurants?: StaffRestaurant[];
  /** All linked OAuth profiles for this staff member */
  linked_profiles?: LinkedProfile[];
  /** @deprecated Use linked_profiles instead - kept for backward compatibility */
  linked_profile?: LinkedProfile | null;
  /** Permission level from user_roles table */
  permission_level?: PermissionLevel;
  // Payroll fields
  tax_class?: string | null;
  is_minijob?: boolean | null;
  is_sv_exempt?: boolean | null;
  date_of_birth?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  tax_id?: string | null;
  social_security_nr?: string | null;
  nationality?: string | null;
  personnel_group?: string | null;
  health_insurance?: string | null;
  vacation_days_contractual?: number | null;
  vacation_days_previous?: number | null;
  vacation_days_current?: number | null;
  vacation_days_taken?: number | null;
  sick_days_total?: number | null;
}

export interface StaffInput {
  name: string;
  first_name?: string;
  last_name?: string;
  perso_nr?: number;
  role: StaffRole;
  hourly_rate?: number;
  notes?: string;
  is_active?: boolean;
  participates_in_pool?: boolean;
  pin_code?: string;
  restaurant_ids?: string[];
  restaurant_assignments?: RestaurantAssignment[];
  // Payroll fields
  tax_class?: string | null;
  is_minijob?: boolean | null;
  is_sv_exempt?: boolean | null;
  date_of_birth?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  tax_id?: string | null;
  social_security_nr?: string | null;
  nationality?: string | null;
  personnel_group?: string | null;
  health_insurance?: string | null;
  vacation_days_contractual?: number | null;
  vacation_days_previous?: number | null;
  vacation_days_current?: number | null;
  vacation_days_taken?: number | null;
  sick_days_total?: number | null;
}

export function useStaff(role?: StaffRole, options?: { includeLinkedProfiles?: boolean }) {
  const includeLinkedProfiles = options?.includeLinkedProfiles ?? false;
  return useQuery({
    queryKey: ['staff', role, includeLinkedProfiles],
    queryFn: async () => {
      // Query staff table (without profile join due to RLS restrictions)
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            zt_department,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
        .order('name', { ascending: true });

      if (role) {
        query = query.in('role', getRoleFilterValues(role));
      }

      const { data: staffData, error } = await query;
      if (error) throw error;
      
      // Fetch linked profiles only when requested (e.g. on Staff Management page)
      let linkedProfilesMap: Record<string, LinkedProfile[]> = {};
      if (includeLinkedProfiles) {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-link-account?action=get-all-linked`,
            {
              method: 'GET',
              headers,
            }
          );
          if (response.ok) {
            const profiles = await response.json();
            for (const p of profiles) {
              if (p.staff_id) {
                if (!linkedProfilesMap[p.staff_id]) {
                  linkedProfilesMap[p.staff_id] = [];
                }
                linkedProfilesMap[p.staff_id].push({
                  id: p.id,
                  user_id: p.user_id,
                  email: p.email,
                  full_name: p.full_name,
                  avatar_url: p.avatar_url,
                });
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch linked profiles:', e);
        }
      }
      
      // Fetch user roles for all staff
      let rolesMap: Record<string, PermissionLevel> = {};
      try {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('staff_id, permission_level');
        if (rolesData) {
          for (const r of rolesData) {
            rolesMap[r.staff_id] = r.permission_level as PermissionLevel;
          }
        }
      } catch (e) {
        console.error('Failed to fetch user roles:', e);
      }

      // Merge linked_profiles and permission_level into staff data
      return (staffData || []).map((staff: any) => {
        const profiles = linkedProfilesMap[staff.id] || [];
        return {
          ...staff,
          linked_profiles: profiles,
          linked_profile: profiles.length > 0 ? profiles[0] : null,
          permission_level: rolesMap[staff.id] || 'staff',
        };
      }) as Staff[];
    },
  });
}

export function useActiveStaff(role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', 'active', role],
    queryFn: async () => {
      // Query staff table directly (pin_code has been moved to separate protected table)
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            zt_department,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (role) {
        query = query.in('role', getRoleFilterValues(role));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
  });
}

/** Returns all enum values that include the given role */
function getRoleFilterValues(role: StaffRole): StaffRole[] {
  if (role === 'waiter') return ['waiter', 'both', 'waiter_gl', 'all'];
  if (role === 'kitchen') return ['kitchen', 'both', 'kitchen_gl', 'all'];
  if (role === 'gl') return ['gl', 'waiter_gl', 'kitchen_gl', 'all'];
  return [role];
}

// Get active staff for a specific restaurant
export function useActiveStaffByRestaurant(restaurantId: string | null, role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', 'active', 'restaurant', restaurantId, role],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      // First get staff IDs for this restaurant
      const { data: staffRestaurants, error: srError } = await supabase
        .from('staff_restaurants')
        .select('staff_id')
        .eq('restaurant_id', restaurantId);
      
      if (srError) throw srError;
      
      const staffIds = staffRestaurants.map(sr => sr.staff_id);
      if (staffIds.length === 0) return [];
      
      // Query staff table directly (pin_code has been moved to separate protected table)
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            zt_department,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
        .eq('is_active', true)
        .in('id', staffIds)
        .order('name', { ascending: true });

      if (role) {
        query = query.in('role', getRoleFilterValues(role));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StaffInput) => {
      const { restaurant_ids, restaurant_assignments, pin_code, ...staffData } = input;
      
      // Check for duplicate staff name
      const { data: duplicateCheck, error: checkError } = await supabase
        .rpc('check_duplicate_staff_name', { p_name: input.name });
      
      if (checkError) throw checkError;
      if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].exists) {
        throw new Error(duplicateCheck[0].error_message || 'Ein Mitarbeiter mit diesem Namen existiert bereits.');
      }
      
      // Create the staff member
      const { data: staff, error } = await supabase
        .from('staff')
        .insert({ ...staffData, nickname: staffData.name })
        .select()
        .single();
      if (error) throw error;
      
      // Add restaurant assignments with zt_department
      const assignments = restaurant_assignments ?? restaurant_ids?.map(rid => ({ restaurant_id: rid, zt_department: null }));
      if (assignments && assignments.length > 0) {
        const { error: assignError } = await supabase
          .from('staff_restaurants')
          .insert(assignments.map(a => ({
            staff_id: staff.id,
            restaurant_id: a.restaurant_id,
            zt_department: a.zt_department,
          })));
        if (assignError) throw assignError;
      }
      
      // Save PIN code via secure edge function
      if (pin_code && pin_code.length === 4) {
        const pinHeaders = await getAuthHeaders();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-pin`,
          {
            method: 'POST',
            headers: {
              ...pinHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              staff_id: staff.id,
              pin_code: pin_code,
            }),
          }
        );
        if (!response.ok) {
          console.error('Failed to set PIN code');
        }
      }
      
      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Mitarbeiter erfolgreich hinzugefügt');
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(msg);
      console.error('Error creating staff:', error);
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, restaurant_ids, restaurant_assignments, pin_code, ...staffData }: Partial<StaffInput> & { id: string }) => {
      // Check for duplicate staff name if name is being changed
      if (staffData.name) {
        const { data: duplicateCheck, error: checkError } = await supabase
          .rpc('check_duplicate_staff_name', { p_name: staffData.name, p_exclude_id: id });
        
        if (checkError) throw checkError;
        if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].exists) {
          throw new Error(duplicateCheck[0].error_message || 'Ein Mitarbeiter mit diesem Namen existiert bereits.');
        }
      }
      
      // Update the staff member
      const staffPayload = staffData.name ? { ...staffData, nickname: staffData.name } : staffData;
      const { data, error } = await supabase
        .from('staff')
        .update(staffPayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Update restaurant assignments if provided
      const assignments = restaurant_assignments ?? restaurant_ids?.map(rid => ({ restaurant_id: rid, zt_department: null }));
      if (assignments !== undefined) {
        // Remove all existing assignments
        const { error: deleteError } = await supabase
          .from('staff_restaurants')
          .delete()
          .eq('staff_id', id);
        if (deleteError) throw deleteError;
        
        // Add new assignments with zt_department
        if (assignments && assignments.length > 0) {
          const { error: insertError } = await supabase
            .from('staff_restaurants')
            .insert(assignments.map(a => ({
              staff_id: id,
              restaurant_id: a.restaurant_id,
              zt_department: a.zt_department,
            })));
          if (insertError) throw insertError;
        }
      }
      
      // Update PIN code via secure edge function if provided
      if (pin_code && pin_code.length === 4) {
        const pinHeaders2 = await getAuthHeaders();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-pin`,
          {
            method: 'POST',
            headers: {
              ...pinHeaders2,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              staff_id: id,
              pin_code: pin_code,
            }),
          }
        );
        if (!response.ok) {
          console.error('Failed to update PIN code');
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-employees'] });
      queryClient.invalidateQueries({ queryKey: ['cumulated-employees'] });
      queryClient.invalidateQueries({ queryKey: ['all-restaurant-employees-zt'] });
      toast.success('Mitarbeiter erfolgreich aktualisiert');
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Fehler beim Aktualisieren: ${msg}`);
      console.error('Error updating staff:', error);
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Mitarbeiter erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Mitarbeiters');
      console.error('Error deleting staff:', error);
    },
  });
}
