import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Sofortmeldung, SofortmeldungStatus } from '@/types/sofortmeldung';
import { SofortmeldungService } from '@/lib/sofortmeldungService';

export function useSofortmeldung(staffId: string | null) {
  return useQuery({
    queryKey: ['sofortmeldung', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      const { data, error } = await supabase
        .from('sofortmeldung' as any)
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Sofortmeldung | null;
    },
    enabled: !!staffId,
  });
}

export function useSofortmeldungList() {
  return useQuery({
    queryKey: ['sofortmeldung', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sofortmeldung' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Sofortmeldung[];
    },
  });
}

export function useCreateSofortmeldung() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      staffData,
      hasRestaurant,
      createdByName,
    }: {
      staffId: string;
      staffData: Record<string, unknown>;
      hasRestaurant: boolean;
      createdByName?: string;
    }) => {
      const validation = SofortmeldungService.validate(staffData, hasRestaurant);
      const status: SofortmeldungStatus = validation.isComplete ? 'bereit' : 'unvollstaendig';

      const { data, error } = await supabase
        .from('sofortmeldung' as any)
        .insert({
          staff_id: staffId,
          status,
          sofortmeldung_required: true,
          missing_fields: validation.missingFields.length > 0 ? validation.missingFields : null,
          validated_at: new Date().toISOString(),
          created_by_name: createdByName || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Create log entry
      await supabase.from('sofortmeldung_log' as any).insert({
        sofortmeldung_id: (data as any).id,
        action: 'created',
        new_status: status,
        details: {
          missing_fields: validation.missingFields,
          sofortmeldung_required: true,
        },
        performed_by_name: createdByName || null,
      });

      return data as unknown as Sofortmeldung;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofortmeldung'] });
    },
  });
}

export function useUpdateSofortmeldungStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sofortmeldungId,
      newStatus,
      performedByName,
      errorMessage,
      exportFormat,
    }: {
      sofortmeldungId: string;
      newStatus: SofortmeldungStatus;
      performedByName?: string;
      errorMessage?: string;
      exportFormat?: string;
    }) => {
      // Get current status
      const { data: current } = await supabase
        .from('sofortmeldung' as any)
        .select('status')
        .eq('id', sofortmeldungId)
        .single();

      const oldStatus = (current as any)?.status;

      const updatePayload: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'gemeldet') updatePayload.reported_at = new Date().toISOString();
      if (newStatus === 'fehler') updatePayload.error_message = errorMessage || null;
      if (exportFormat) {
        updatePayload.export_format = exportFormat;
        updatePayload.exported_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('sofortmeldung' as any)
        .update(updatePayload)
        .eq('id', sofortmeldungId);
      if (error) throw error;

      // Log
      await supabase.from('sofortmeldung_log' as any).insert({
        sofortmeldung_id: sofortmeldungId,
        action: 'status_change',
        old_status: oldStatus,
        new_status: newStatus,
        performed_by_name: performedByName || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofortmeldung'] });
      toast.success('Meldestatus aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Meldestatus');
    },
  });
}

export function useRevalidateSofortmeldung() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sofortmeldungId,
      staffData,
      hasRestaurant,
      performedByName,
    }: {
      sofortmeldungId: string;
      staffData: Record<string, unknown>;
      hasRestaurant: boolean;
      performedByName?: string;
    }) => {
      const validation = SofortmeldungService.validate(staffData, hasRestaurant);
      const newStatus: SofortmeldungStatus = validation.isComplete ? 'bereit' : 'unvollstaendig';

      const { data: current } = await supabase
        .from('sofortmeldung' as any)
        .select('status')
        .eq('id', sofortmeldungId)
        .single();

      const oldStatus = (current as any)?.status;

      await supabase
        .from('sofortmeldung' as any)
        .update({
          status: newStatus,
          missing_fields: validation.missingFields.length > 0 ? validation.missingFields : null,
          validated_at: new Date().toISOString(),
        })
        .eq('id', sofortmeldungId);

      await supabase.from('sofortmeldung_log' as any).insert({
        sofortmeldung_id: sofortmeldungId,
        action: 'validation',
        old_status: oldStatus,
        new_status: newStatus,
        details: { missing_fields: validation.missingFields },
        performed_by_name: performedByName || null,
      });

      return { newStatus, missingFields: validation.missingFields };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofortmeldung'] });
    },
  });
}
