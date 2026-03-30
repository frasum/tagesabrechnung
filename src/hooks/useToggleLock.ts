import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseToggleLockParams {
  sessionId: string | undefined;
  restaurantId: string | null;
  userName: string | undefined;
  selectedDate: Date;
}

export function useToggleLock({ sessionId, restaurantId, userName, selectedDate }: UseToggleLockParams) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const handleToggleLock = async (unlock: boolean) => {
    if (!sessionId || !restaurantId) return;
    try {
      await supabase.from('sessions').update({
        is_unlocked: unlock,
        unlocked_at: unlock ? new Date().toISOString() : null,
        unlocked_by_name: unlock ? (userName || null) : null,
      } as any).eq('id', sessionId);

      await supabase.from('audit_logs').insert({
        table_name: 'sessions',
        record_id: sessionId,
        action: unlock ? 'unlock' : 'lock',
        changed_by_name: userName || 'Unbekannt',
        restaurant_id: restaurantId,
        old_values: { is_unlocked: !unlock },
        new_values: { is_unlocked: unlock, unlocked_by_name: unlock ? userName : null },
      });

      toast({ title: unlock ? 'Abrechnung entsperrt' : 'Abrechnung gesperrt' });

      // Optimistic cache update — no flicker, no cascade
      queryClient.setQueryData(['session', dateStr, restaurantId], (old: any) =>
        old ? { ...old, is_unlocked: unlock, unlocked_at: unlock ? new Date().toISOString() : null, unlocked_by_name: unlock ? (userName || null) : null } : old
      );
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  return { handleToggleLock };
}
