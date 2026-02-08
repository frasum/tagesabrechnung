import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import { useCashBalanceData } from '@/hooks/useCashBalanceData';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  return format(date, 'EEE d.MMM', { locale: de });
};

export default function CashBalance() {
  const { data, isLoading, error } = useCashBalanceData();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Bargeldbestand</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tägliche Bargeldübersicht</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Datum</TableHead>
                    <TableHead className="text-right min-w-[100px]">Tagesumsatz</TableHead>
                    <TableHead className="text-right min-w-[100px]">Kreditkarten</TableHead>
                    <TableHead className="text-right min-w-[100px]">OrderSmart</TableHead>
                    <TableHead className="text-right min-w-[90px]">Wolt</TableHead>
                    <TableHead className="text-right min-w-[100px]">Gutsch. EL</TableHead>
                    <TableHead className="text-right min-w-[90px]">FineDine</TableHead>
                    <TableHead className="text-right min-w-[100px]">Gutsch. VK</TableHead>
                    <TableHead className="text-right min-w-[90px]">Einladung</TableHead>
                    <TableHead className="text-right min-w-[90px]">Offene RE</TableHead>
                    <TableHead className="text-right min-w-[90px]">Vorschuss</TableHead>
                    <TableHead className="text-right min-w-[90px]">Ausgaben</TableHead>
                    <TableHead className="text-right min-w-[110px] font-bold">Bargeld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 13 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-destructive">
                        Fehler beim Laden der Daten
                      </TableCell>
                    </TableRow>
                  ) : data && data.length > 0 ? (
                    data.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(row.kellnerUmsatz)}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.kreditkarten)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.ordersmart)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.wolt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.gutscheineEL)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.finedine)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(row.gutscheineVK)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.einladung)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.offeneRE)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.vorschuss)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          -{formatCurrency(row.ausgaben)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-bold',
                            row.bargeld >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                          )}
                        >
                          {formatCurrency(row.bargeld)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground">
                        Keine Daten vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {data && data.length > 0 && !isLoading && (
                  <TableFooter>
                    <TableRow className="bg-muted/50">
                      <TableCell className="sticky left-0 bg-muted/50 z-10 font-bold">
                        GESAMT
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.reduce((sum, row) => sum + row.kellnerUmsatz, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.kreditkarten, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.ordersmart, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.wolt, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.gutscheineEL, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.finedine, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(data.reduce((sum, row) => sum + row.gutscheineVK, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.einladung, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.offeneRE, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.vorschuss, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        -{formatCurrency(data.reduce((sum, row) => sum + row.ausgaben, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(data.reduce((sum, row) => sum + row.bargeld, 0))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
