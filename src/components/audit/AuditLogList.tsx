import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, User, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs, getChangedFields, fieldLabels } from '@/hooks/useAuditLogs';
import { useRestaurant } from '@/hooks/useRestaurant';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '–';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  }
  return String(value);
}

export function AuditLogList() {
  const { restaurantId } = useRestaurant();
  const { data: logs = [], isLoading } = useAuditLogs(restaurantId, 100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Änderungsprotokoll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Filter to only show waiter_shifts changes
  const waiterShiftLogs = logs.filter(log => log.table_name === 'waiter_shifts');

  if (waiterShiftLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Änderungsprotokoll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Noch keine Änderungen protokolliert.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Änderungsprotokoll
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {waiterShiftLogs.map((log) => {
          const oldVals = log.old_values as Record<string, unknown> | null;
          const newVals = log.new_values as Record<string, unknown> | null;
          const changes = getChangedFields(oldVals, newVals);
          const waiterName = String(newVals?.waiter_name || oldVals?.waiter_name || 'Unbekannt');

          return (
            <div
              key={log.id}
              className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors"
            >
              {/* Header with timestamp and user */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(log.created_at), "dd.MM.yyyy, HH:mm 'Uhr'", { locale: de })}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5" />
                  {log.changed_by_name}
                </span>
              </div>

              {/* What was changed */}
              <div className="text-sm">
                <span className="text-muted-foreground">
                  Mitarbeiter-Abrechnung von{' '}
                </span>
                <span className="font-medium">"{waiterName}"</span>
                <span className="text-muted-foreground"> geändert:</span>
              </div>

              {/* Changes list */}
              {changes.length > 0 ? (
                <ul className="space-y-1.5 pl-4">
                  {changes.map(({ field, oldValue, newValue }) => (
                    <li key={field} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium">{fieldLabels[field] || field}:</span>
                      <span className="text-muted-foreground">{formatValue(oldValue)}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground font-medium">{formatValue(newValue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground pl-4">
                  Keine Änderungen an überwachten Feldern.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
