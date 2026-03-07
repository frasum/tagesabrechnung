import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PettyCashValue {
  amount: number;
}

export function usePettyCash(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: pettyCash, isLoading } = useQuery({
    queryKey: ['settings', 'petty_cash', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'petty_cash')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) throw error;
      const value = data?.value as unknown as PettyCashValue | undefined;
      return value?.amount ?? 0;
    },
    enabled: !!restaurantId,
  });

  const { mutate: updatePettyCash, isPending: isUpdating } = useMutation({
    mutationFn: async ({ amount, restaurantId: restId }: { amount: number; restaurantId: string }) => {
      // First try to update
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'petty_cash')
        .eq('restaurant_id', restId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: { amount } })
          .eq('key', 'petty_cash')
          .eq('restaurant_id', restId);

        if (error) throw error;
      } else {
        // Insert if not exists
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'petty_cash', value: { amount }, restaurant_id: restId });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'petty_cash', restaurantId] });
    },
  });

  return {
    pettyCash: pettyCash ?? 0,
    isLoading,
    updatePettyCash,
    isUpdating,
  };
}

export function useShowTipRanking(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: showTipRanking, isLoading } = useQuery({
    queryKey: ['settings', 'show_tip_ranking', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return true;

      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'show_tip_ranking')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      const value = data?.value as unknown as { enabled: boolean } | undefined;
      return value?.enabled ?? true;
    },
    enabled: !!restaurantId,
  });

  const { mutate: updateShowTipRanking, isPending: isUpdating } = useMutation({
    mutationFn: async ({ enabled, restaurantId: restId }: { enabled: boolean; restaurantId: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'show_tip_ranking')
        .eq('restaurant_id', restId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: { enabled } })
          .eq('key', 'show_tip_ranking')
          .eq('restaurant_id', restId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'show_tip_ranking', value: { enabled }, restaurant_id: restId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'show_tip_ranking', restaurantId] });
    },
  });

  return {
    showTipRanking: showTipRanking ?? true,
    isLoading,
    updateShowTipRanking,
    isUpdating,
  };
}

export function useOrdersmartInTakeaway(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: ordersmartInTakeaway, isLoading } = useQuery({
    queryKey: ['ordersmart-in-takeaway', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return true;
      const { data, error } = await supabase
        .from('restaurants')
        .select('ordersmart_in_takeaway')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data?.ordersmart_in_takeaway ?? true;
    },
    enabled: !!restaurantId,
  });

  const { mutate: updateOrdersmartInTakeaway, isPending: isUpdating } = useMutation({
    mutationFn: async ({ value, restaurantId: restId }: { value: boolean; restaurantId: string }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ ordersmart_in_takeaway: value })
        .eq('id', restId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordersmart-in-takeaway', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });

  return {
    ordersmartInTakeaway: ordersmartInTakeaway ?? true,
    isLoading,
    updateOrdersmartInTakeaway,
    isUpdating,
  };
}

export function useCommissionAddToGross(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: commissionAddToGross, isLoading } = useQuery({
    queryKey: ['settings', 'commission_add_to_gross', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return false;
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'commission_add_to_gross')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (error) throw error;
      const value = data?.value as unknown as { enabled: boolean } | undefined;
      return value?.enabled ?? false;
    },
    enabled: !!restaurantId,
  });

  const { mutate: updateCommissionAddToGross, isPending: isUpdating } = useMutation({
    mutationFn: async ({ enabled, restaurantId: restId }: { enabled: boolean; restaurantId: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'commission_add_to_gross')
        .eq('restaurant_id', restId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: { enabled } })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'commission_add_to_gross', value: { enabled }, restaurant_id: restId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'commission_add_to_gross', restaurantId] });
    },
  });

  return {
    commissionAddToGross: commissionAddToGross ?? false,
    isLoading,
    updateCommissionAddToGross,
    isUpdating,
  };
}

export function useInitialCashDeficit(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: initialDeficit, isLoading } = useQuery({
    queryKey: ['initial-cash-deficit', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;

      const { data, error } = await supabase
        .from('restaurants')
        .select('initial_cash_deficit')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;
      return (data as any)?.initial_cash_deficit ?? 0;
    },
    enabled: !!restaurantId,
  });

  const { mutate: updateInitialDeficit, isPending: isUpdating } = useMutation({
    mutationFn: async ({ amount, restaurantId: restId }: { amount: number; restaurantId: string }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ initial_cash_deficit: amount } as any)
        .eq('id', restId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initial-cash-deficit', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });

  return {
    initialDeficit: initialDeficit ?? 0,
    isLoading,
    updateInitialDeficit,
    isUpdating,
  };
}
