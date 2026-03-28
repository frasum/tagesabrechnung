import { Zap, AlertTriangle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Sofortmeldung, SofortmeldungStatus } from '@/types/sofortmeldung';
import { SOFORTMELDUNG_STATUS_CONFIG, FIELD_LABELS } from '@/types/sofortmeldung';
import { SofortmeldungService } from '@/lib/sofortmeldungService';
import { useUpdateSofortmeldungStatus, useRevalidateSofortmeldung } from '@/hooks/useSofortmeldung';

interface SofortmeldungBannerProps {
  sofortmeldung: Sofortmeldung | null;
  staffData: Record<string, unknown>;
  hasRestaurant: boolean;
  isNewStaff: boolean;
}

export function SofortmeldungBanner({ sofortmeldung, staffData, hasRestaurant, isNewStaff }: SofortmeldungBannerProps) {
  const updateStatus = useUpdateSofortmeldungStatus();
  const revalidate = useRevalidateSofortmeldung();

  // For new staff, show a static info banner
  if (isNewStaff) {
    const validation = SofortmeldungService.validate(staffData, hasRestaurant);
    return (
      <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Sofortmeldung erforderlich — Gastronomie (§28a SGB IV)
          </span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Nach dem Speichern wird automatisch ein Meldevorgang angelegt.
        </p>
        {validation.missingFields.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fehlende Pflichtfelder:
            </p>
            <div className="flex flex-wrap gap-1">
              {validation.missingFields.map(f => (
                <Badge key={f} variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-400">
                  {FIELD_LABELS[f] || f}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // For existing staff without sofortmeldung record
  if (!sofortmeldung) return null;

  const config = SOFORTMELDUNG_STATUS_CONFIG[sofortmeldung.status as SofortmeldungStatus] ?? SOFORTMELDUNG_STATUS_CONFIG.entwurf;
  const missingFields = (sofortmeldung.missing_fields ?? []) as string[];

  const handleExportJSON = () => {
    const json = SofortmeldungService.exportJSON(staffData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sofortmeldung_${staffData.last_name || staffData.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (sofortmeldung) {
      updateStatus.mutate({
        sofortmeldungId: sofortmeldung.id,
        newStatus: sofortmeldung.status as SofortmeldungStatus,
        exportFormat: 'json',
      });
    }
    toast.success('JSON-Export heruntergeladen');
  };

  const handleExportCSV = () => {
    const csv = SofortmeldungService.exportCSV(staffData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sofortmeldung_${staffData.last_name || staffData.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (sofortmeldung) {
      updateStatus.mutate({
        sofortmeldungId: sofortmeldung.id,
        newStatus: sofortmeldung.status as SofortmeldungStatus,
        exportFormat: 'csv',
      });
    }
    toast.success('CSV-Export heruntergeladen');
  };

  const handleRevalidate = () => {
    revalidate.mutate({
      sofortmeldungId: sofortmeldung.id,
      staffData,
      hasRestaurant,
    });
  };

  const isComplete = missingFields.length === 0;
  const borderClass = isComplete
    ? 'border-emerald-300 dark:border-emerald-700'
    : 'border-amber-300 dark:border-amber-700';
  const bgClass = isComplete
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : 'bg-amber-50 dark:bg-amber-950/30';

  return (
    <div className={`rounded-lg border-2 ${borderClass} ${bgClass} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-sm">Sofortmeldung (§28a SGB IV)</span>
        </div>
        <Badge className={`${config.bgClass} ${config.textClass} border-0 text-[10px]`}>
          {config.label}
        </Badge>
      </div>

      {missingFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium flex items-center gap-1 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Fehlende Pflichtfelder ({missingFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {missingFields.map(f => (
              <Badge key={f} variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-400">
                {FIELD_LABELS[f] || f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isComplete && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" />
          Alle Pflichtfelder ausgefüllt — bereit zur Meldung
        </p>
      )}

      {sofortmeldung.exported_at && (
        <p className="text-[10px] text-muted-foreground">
          Letzter Export: {new Date(sofortmeldung.exported_at).toLocaleString('de-DE')}
          {sofortmeldung.export_format && ` (${sofortmeldung.export_format.toUpperCase()})`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleRevalidate}>
          <RefreshCw className="w-3 h-3" />
          Prüfen
        </Button>
        <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExportJSON}>
          <Download className="w-3 h-3" />
          JSON-Export
        </Button>
        <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExportCSV}>
          <Download className="w-3 h-3" />
          CSV-Export
        </Button>
      </div>
    </div>
  );
}
