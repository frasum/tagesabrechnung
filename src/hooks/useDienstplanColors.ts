import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DienstplanColors {
  vacation: string;
  sick: string;
}

const DEFAULTS: DienstplanColors = { vacation: '#f59e0b', sick: '#ef4444' };

// Uses a fixed restaurant_id to store global dienstplan colors.
// We pick the first restaurant; if none exists we fall back to defaults.
const SETTINGS_KEY = 'dienstplan_colors';

export function useDienstplanColors() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dienstplan_colors'],
    queryFn: async (): Promise<DienstplanColors> => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULTS;
      const val = data.value as Record<string, string>;
      return {
        vacation: val.vacation || DEFAULTS.vacation,
        sick: val.sick || DEFAULTS.sick,
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ colors, restaurantId }: { colors: DienstplanColors; restaurantId: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: colors as unknown as Record<string, unknown> })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: SETTINGS_KEY, restaurant_id: restaurantId, value: colors as unknown as Record<string, unknown> });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dienstplan_colors'] });
    },
  });

  return {
    colors: query.data ?? DEFAULTS,
    isLoading: query.isLoading,
    saveColors: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
