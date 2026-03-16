import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Skill {
  id: string;
  name: string;
  category: string;
  color: string;
  sort_order: number;
}

export interface EmployeeSkill {
  id: string;
  staff_id: string;
  skill_id: string;
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Skill[];
    },
  });
}

export function useEmployeeSkills(staffIds?: string[]) {
  return useQuery({
    queryKey: ['employee_skills', staffIds],
    queryFn: async () => {
      let query = supabase.from('employee_skills').select('*');
      if (staffIds && staffIds.length > 0) {
        query = query.in('staff_id', staffIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeSkill[];
    },
    enabled: !staffIds || staffIds.length > 0,
  });
}

export function useToggleEmployeeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, skillId, hasSkill }: { staffId: string; skillId: string; hasSkill: boolean }) => {
      if (hasSkill) {
        const { error } = await supabase
          .from('employee_skills')
          .delete()
          .eq('staff_id', staffId)
          .eq('skill_id', skillId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_skills')
          .insert({ staff_id: staffId, skill_id: skillId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_skills'] });
    },
  });
}
