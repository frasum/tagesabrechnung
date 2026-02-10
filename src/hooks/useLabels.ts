import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LabelKey =
  | 'ordersmart_revenue'
  | 'wolt_revenue'
  | 'pos_total'
  | 'takeaway_total'
  | 'terminal_1'
  | 'terminal_2'
  | 'card_total_gl'
  | 'vouchers_sold'
  | 'vouchers_redeemed'
  | 'finedine_vouchers'
  | 'einladung'
  | 'sonstige_einnahme'
  | 'kassiert_brutto'
  | 'pos_sales'
  | 'open_invoices'
  | 'hilf_mahl'
  | 'cash_handed_in'
  | 'kitchen_tip';

export const DEFAULT_LABELS: Record<LabelKey, string> = {
  ordersmart_revenue: 'SoUse',
  wolt_revenue: 'Wolt',
  pos_total: 'Umsatz Abschlag',
  takeaway_total: 'Takeaway Abschlag',
  terminal_1: 'Terminal 1',
  terminal_2: 'Terminal 2',
  card_total_gl: 'GL Kredit Karten',
  vouchers_sold: 'Gutschein Verkauf',
  vouchers_redeemed: 'Gutschein Eingelöst',
  finedine_vouchers: 'FineDine',
  einladung: 'Einladung',
  sonstige_einnahme: 'Sonstige Einnahmen',
  kassiert_brutto: 'Abzugebender Betrag',
  pos_sales: 'Leistung',
  open_invoices: 'Offene Rechnung',
  hilf_mahl: 'Hilf Mahl',
  cash_handed_in: 'Abgegebenes Bargeld',
  kitchen_tip: 'Trinkgeld für Küche',
};

export type LabelOverrides = Partial<Record<LabelKey, string>>;

export function useLabels(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: overrides, isLoading } = useQuery({
    queryKey: ['settings', 'label_overrides', restaurantId],
    queryFn: async (): Promise<LabelOverrides> => {
      if (!restaurantId) return {};

      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'label_overrides')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      return (data?.value as unknown as LabelOverrides) ?? {};
    },
    enabled: !!restaurantId,
  });

  // Hidden fields
  const { data: hiddenFields = [] } = useQuery({
    queryKey: ['settings', 'hidden_fields', restaurantId],
    queryFn: async (): Promise<LabelKey[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'hidden_fields')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      return (data?.value as unknown as LabelKey[]) ?? [];
    },
    enabled: !!restaurantId,
  });

  const isFieldHidden = (key: LabelKey): boolean => hiddenFields.includes(key);

  const { mutateAsync: saveHiddenFields, isPending: isSavingHidden } = useMutation({
    mutationFn: async ({ hiddenFields: newHidden, restaurantId: restId }: { hiddenFields: LabelKey[]; restaurantId: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'hidden_fields')
        .eq('restaurant_id', restId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: newHidden as any })
          .eq('key', 'hidden_fields')
          .eq('restaurant_id', restId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'hidden_fields', value: newHidden as any, restaurant_id: restId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'hidden_fields', restaurantId] });
    },
  });

  const getLabel = (key: LabelKey): string => {
    return overrides?.[key] || DEFAULT_LABELS[key];
  };

  // Returns a full map of all labels (with overrides applied)
  const allLabels: Record<LabelKey, string> = { ...DEFAULT_LABELS };
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (v) allLabels[k as LabelKey] = v;
    }
  }

  const { mutateAsync: saveOverrides, isPending: isSaving } = useMutation({
    mutationFn: async ({ overrides: newOverrides, restaurantId: restId }: { overrides: LabelOverrides; restaurantId: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'label_overrides')
        .eq('restaurant_id', restId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: newOverrides as any })
          .eq('key', 'label_overrides')
          .eq('restaurant_id', restId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'label_overrides', value: newOverrides as any, restaurant_id: restId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'label_overrides', restaurantId] });
    },
  });

  return {
    getLabel,
    allLabels,
    overrides: overrides ?? {},
    hiddenFields,
    isFieldHidden,
    isLoading,
    saveOverrides,
    isSaving,
    saveHiddenFields,
    isSavingHidden,
  };
}
