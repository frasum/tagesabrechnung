import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TelegramSettings {
  id: string;
  excluded_restaurants: string[];
  show_pos_total: boolean;
  show_guest_count: boolean;
  show_cash_balance: boolean;
  show_cash_details: boolean;
  show_created_by: boolean;
  show_waiters: boolean;
  show_kitchen: boolean;
  show_pdf_export_notification: boolean;
  show_notes: boolean;
}

export function useTelegramSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['telegram-settings'],
    queryFn: async (): Promise<TelegramSettings | null> => {
      const { data, error } = await supabase
        .from('telegram_settings')
        .select('id, excluded_restaurants, show_pos_total, show_guest_count, show_cash_balance, show_cash_details, show_created_by, show_waiters, show_kitchen, show_pdf_export_notification, show_notes')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TelegramSettings | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: Omit<TelegramSettings, 'id'> & { id?: string }) => {
      const payload = {
        excluded_restaurants: settings.excluded_restaurants,
        show_pos_total: settings.show_pos_total,
        show_guest_count: settings.show_guest_count,
        show_cash_balance: settings.show_cash_balance,
        show_cash_details: settings.show_cash_details,
        show_created_by: settings.show_created_by,
        show_waiters: settings.show_waiters,
        show_kitchen: settings.show_kitchen,
        show_pdf_export_notification: settings.show_pdf_export_notification,
        show_notes: settings.show_notes,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('telegram_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('telegram_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings'] });
      toast({ title: 'Gespeichert', description: 'Telegram-Einstellungen wurden gespeichert.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase.functions.invoke('send-telegram-summary', {
        body: { date },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Gesendet', description: 'Testnachricht wurde gesendet.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler beim Senden', description: error.message, variant: 'destructive' });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    sendTest: sendTestMutation.mutate,
    isSending: sendTestMutation.isPending,
  };
}
