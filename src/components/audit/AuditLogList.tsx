import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, User, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAuditLogs(restaurantId, page);
  const logs = data?.logs ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 30));

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

  if (logs.length === 0 && page === 0) {
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
        {logs.map((log) => {
          const oldVals = log.old_values as Record<string, unknown> | null;
          const newVals = log.new_values as Record<string, unknown> | null;
          const changes = getChangedFields(oldVals, newVals);
          const waiterName = String(newVals?.waiter_name || oldVals?.waiter_name || 'Unbekannt');

          return (
            <div
              key={log.id}
              className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors"
            >
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

              <div className="text-sm">
                <span className="text-muted-foreground">
                  Mitarbeiter-Abrechnung von{' '}
                </span>
                <span className="font-medium">"{waiterName}"</span>
                <span className="text-muted-foreground"> geändert:</span>
              </div>

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

        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .map((i, idx, arr) => {
                  const elements = [];
                  if (idx > 0 && arr[idx - 1] !== i - 1) {
                    elements.push(
                      <PaginationItem key={`ellipsis-${i}`}>
                        <span className="px-2 text-muted-foreground">…</span>
                      </PaginationItem>
                    );
                  }
                  elements.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={i === page}
                        onClick={() => setPage(i)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                  return elements;
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
