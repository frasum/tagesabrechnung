import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePettyCash } from '@/hooks/useSettings';

export interface RegisterTransfer {
  id: string;
  transfer_date: string;
  amount: number;
  direction: 'to_restaurant' | 'to_safe';
  reason: string | null;
  created_by_name: string | null;
  restaurant_id: string;
  created_at: string;
}

export interface RegisterBalances {
  safeBalance: number;
  restaurantBalance: number;
  initialSafe: number;
  initialRestaurant: number;
  totalToRestaurant: number;
  totalToSafe: number;
}

export function useRegisterTransfers(restaurantId: string | null) {
  const queryClient = useQueryClient();
  const { pettyCash } = usePettyCash(restaurantId);
  
  // Default initial amounts (50/50 split of petty cash)
  const totalFloat = pettyCash || 2000;
  const initialSafe = totalFloat / 2;
  const initialRestaurant = totalFloat / 2;

  // Fetch all transfers
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['register-transfers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('register_transfers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RegisterTransfer[];
    },
    enabled: !!restaurantId,
  });

  // Calculate current balances
  const balances: RegisterBalances = transfers.reduce(
    (acc, transfer) => {
      if (transfer.direction === 'to_restaurant') {
        acc.totalToRestaurant += transfer.amount;
      } else {
        acc.totalToSafe += transfer.amount;
      }
      return acc;
    },
    {
      safeBalance: 0,
      restaurantBalance: 0,
      initialSafe,
      initialRestaurant,
      totalToRestaurant: 0,
      totalToSafe: 0,
    }
  );

  // Calculate final balances
  balances.safeBalance = initialSafe - balances.totalToRestaurant + balances.totalToSafe;
  balances.restaurantBalance = initialRestaurant + balances.totalToRestaurant - balances.totalToSafe;

  // Create transfer mutation
  const { mutate: createTransfer, isPending: isCreating } = useMutation({
    mutationFn: async (transfer: Omit<RegisterTransfer, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('register_transfers')
        .insert(transfer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['register-transfers', restaurantId] });
    },
  });

  // Delete transfer mutation
  const { mutate: deleteTransfer, isPending: isDeleting } = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from('register_transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['register-transfers', restaurantId] });
    },
  });

  return {
    transfers,
    balances,
    isLoading,
    createTransfer,
    isCreating,
    deleteTransfer,
    isDeleting,
  };
}
