import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankDeposit {
  id: string;
  deposit_date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface CreateBankDeposit {
  deposit_date: string;
  amount: number;
  notes?: string;
}

export function useBankDeposits() {
  const queryClient = useQueryClient();

  const depositsQuery = useQuery({
    queryKey: ['bank-deposits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_deposits')
        .select('*')
        .order('deposit_date', { ascending: false });

      if (error) throw error;
      return data as BankDeposit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (deposit: CreateBankDeposit) => {
      const { data, error } = await supabase
        .from('bank_deposits')
        .insert({
          deposit_date: deposit.deposit_date,
          amount: deposit.amount,
          notes: deposit.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-deposits'] });
      toast.success('Bankeinzahlung erfolgreich hinzugefügt');
    },
    onError: (error) => {
      console.error('Error creating bank deposit:', error);
      toast.error('Fehler beim Hinzufügen der Bankeinzahlung');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_deposits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-deposits'] });
      toast.success('Bankeinzahlung gelöscht');
    },
    onError: (error) => {
      console.error('Error deleting bank deposit:', error);
      toast.error('Fehler beim Löschen der Bankeinzahlung');
    },
  });

  const totalDeposits = depositsQuery.data?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
  const latestDeposit = depositsQuery.data?.[0] ?? null;

  return {
    deposits: depositsQuery.data ?? [],
    isLoading: depositsQuery.isLoading,
    error: depositsQuery.error,
    totalDeposits,
    latestDeposit,
    createDeposit: createMutation.mutate,
    deleteDeposit: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
