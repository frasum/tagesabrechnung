import { useMemo, useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { useSofortmeldungList, useUpdateSofortmeldungStatus, useRevalidateSofortmeldung } from '@/hooks/useSofortmeldung';
import { SofortmeldungService } from '@/lib/sofortmeldungService';
import { exportSofortmeldungPdf } from '@/lib/exportSofortmeldungPdf';
import { SOFORTMELDUNG_STATUS_CONFIG, FIELD_LABELS } from '@/types/sofortmeldung';
import type { SofortmeldungStatus, Sofortmeldung } from '@/types/sofortmeldung';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Zap, Download, RefreshCw, FileText, FileJson, FileSpreadsheet,
  CheckCircle, AlertTriangle, Clock, XCircle, Filter
} from 'lucide-react';

const STATUS_ICONS: Record<string, typeof Zap> = {
  entwurf: Clock,
  unvollstaendig: AlertTriangle,
  bereit: CheckCircle,
  erforderlich: Zap,
  gemeldet: CheckCircle,
  fehler: XCircle,
};

export default function SofortmeldungDashboard() {
  const { data: staffList = [] } = useStaff();
  const { data: meldungen = [], isLoading } = useSofortmeldungList();
  const updateStatus = useUpdateSofortmeldungStatus();
  const revalidate = useRevalidateSofortmeldung();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const staffMap = useMemo(() => {
    const map: Record<string, typeof staffList[0]> = {};
    for (const s of staffList) map[s.id] = s;
    return map;
  }, [staffList]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return meldungen;
    return meldungen.filter(m => m.status === statusFilter);
  }, [meldungen, statusFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { total: meldungen.length };
    for (const m of meldungen) c[m.status] = (c[m.status] || 0) + 1;
    return c;
  }, [meldungen]);

  const getStaffData = (staffId: string): Record<string, unknown> => {
    const s = staffMap[staffId];
    if (!s) return {};
    return { ...s } as Record<string, unknown>;
  };

  const handleExportPdf = (m: Sofortmeldung) => {
    const s = staffMap[m.staff_id];
    if (!s) return;
    const restaurants = s.staff_restaurants?.map(r => r.restaurants?.name).filter(Boolean).join(', ') || '—';

    exportSofortmeldungPdf({
      vorname: s.first_name || '',
      nachname: s.last_name || '',
      geburtsdatum: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('de-DE') : '',
      nationalitaet: s.nationality || '',
      strasse: s.address_street || '',
      plz: s.address_zip || '',
      ort: s.address_city || '',
      sozialversicherungsnr: s.social_security_nr || '',
      steuerId: s.tax_id || '',
      krankenkasse: s.health_insurance || '',
      eintrittsdatum: s.employment_start ? new Date(s.employment_start).toLocaleDateString('de-DE') : '',
      arbeitsbeginn: s.work_start_time || '',
      beschaeftigungsart: s.employment_type || '',
      taetigkeit: s.activity_description || '',
      minijob: s.is_minijob ?? false,
      restaurant: restaurants,
    });

    updateStatus.mutate({
      sofortmeldungId: m.id,
      newStatus: m.status as SofortmeldungStatus,
      exportFormat: 'pdf',
    });
    toast.success('PDF-Meldebogen heruntergeladen');
  };

  const handleExportJson = (m: Sofortmeldung) => {
    const staffData = getStaffData(m.staff_id);
    const json = SofortmeldungService.exportJSON(staffData);
    downloadBlob(json, 'application/json', `sofortmeldung_${staffData.last_name || 'export'}.json`);
    updateStatus.mutate({ sofortmeldungId: m.id, newStatus: m.status as SofortmeldungStatus, exportFormat: 'json' });
    toast.success('JSON-Export heruntergeladen');
  };

  const handleExportCsv = (m: Sofortmeldung) => {
    const staffData = getStaffData(m.staff_id);
    const csv = SofortmeldungService.exportCSV(staffData);
    downloadBlob(csv, 'text/csv;charset=utf-8;', `sofortmeldung_${staffData.last_name || 'export'}.csv`);
    updateStatus.mutate({ sofortmeldungId: m.id, newStatus: m.status as SofortmeldungStatus, exportFormat: 'csv' });
    toast.success('CSV-Export heruntergeladen');
  };

  const handleRevalidate = (m: Sofortmeldung) => {
    const s = staffMap[m.staff_id];
    const hasRestaurant = (s?.staff_restaurants?.length ?? 0) > 0;
    revalidate.mutate({
      sofortmeldungId: m.id,
      staffData: getStaffData(m.staff_id),
      hasRestaurant,
    });
  };

  const handleMarkReported = (m: Sofortmeldung) => {
    updateStatus.mutate({ sofortmeldungId: m.id, newStatus: 'gemeldet' });
  };

  return (
    <GlobalLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Sofortmeldung — Compliance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Übersicht aller Sofortmeldungen nach §28a SGB IV
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Gesamt" count={counts.total || 0} color="text-foreground" />
          <SummaryCard label="Unvollständig" count={counts.unvollstaendig || 0} color="text-destructive" />
          <SummaryCard label="Bereit" count={counts.bereit || 0} color="text-emerald-600 dark:text-emerald-400" />
          <SummaryCard label="Erforderlich" count={counts.erforderlich || 0} color="text-amber-600 dark:text-amber-400" />
          <SummaryCard label="Gemeldet" count={counts.gemeldet || 0} color="text-blue-600 dark:text-blue-400" />
          <SummaryCard label="Fehler" count={counts.fehler || 0} color="text-destructive" />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {Object.entries(SOFORTMELDUNG_STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Laden…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Keine Sofortmeldungen gefunden.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const staff = staffMap[m.staff_id];
              const config = SOFORTMELDUNG_STATUS_CONFIG[m.status as SofortmeldungStatus] ?? SOFORTMELDUNG_STATUS_CONFIG.entwurf;
              const Icon = STATUS_ICONS[m.status] || Clock;
              const missingFields = (m.missing_fields ?? []) as string[];

              return (
                <Card key={m.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Name + Status */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.textClass}`} />
                          <span className="font-semibold text-sm">
                            {staff ? `${staff.first_name || ''} ${staff.last_name || staff.name}`.trim() : m.staff_id.slice(0, 8)}
                          </span>
                          <Badge className={`${config.bgClass} ${config.textClass} border-0 text-[10px]`}>
                            {config.label}
                          </Badge>
                        </div>

                        {missingFields.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {missingFields.map(f => (
                              <Badge key={f} variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-400">
                                {FIELD_LABELS[f] || f}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-4 text-[10px] text-muted-foreground">
                          {m.validated_at && <span>Geprüft: {new Date(m.validated_at).toLocaleString('de-DE')}</span>}
                          {m.exported_at && <span>Export: {new Date(m.exported_at).toLocaleString('de-DE')} ({m.export_format?.toUpperCase()})</span>}
                          {m.reported_at && <span>Gemeldet: {new Date(m.reported_at).toLocaleString('de-DE')}</span>}
                        </div>

                        {m.error_message && (
                          <p className="text-[10px] text-destructive">{m.error_message}</p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleRevalidate(m)}>
                          <RefreshCw className="w-3 h-3" /> Prüfen
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleExportPdf(m)}>
                          <FileText className="w-3 h-3" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleExportJson(m)}>
                          <FileJson className="w-3 h-3" /> JSON
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleExportCsv(m)}>
                          <FileSpreadsheet className="w-3 h-3" /> CSV
                        </Button>
                        {m.status === 'bereit' && (
                          <Button size="sm" className="text-xs gap-1" onClick={() => handleMarkReported(m)}>
                            <CheckCircle className="w-3 h-3" /> Als gemeldet markieren
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{count}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
