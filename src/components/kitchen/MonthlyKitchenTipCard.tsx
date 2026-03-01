import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentMonthTips } from '@/hooks/useMonthlyStaffTips';
import { useRestaurant } from '@/hooks/useRestaurant';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatHours = (hours: number) => {
  return `${hours.toFixed(1)} Std.`;
};

export function MonthlyKitchenTipCard() {
  const { restaurantId } = useRestaurant();
  const { data: monthData, isLoading } = useCurrentMonthTips(restaurantId ? [restaurantId] : null);
  
  const currentMonthLabel = format(new Date(), 'MMMM yyyy', { locale: de });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const kitchenTips = monthData?.kitchenTips || [];
  const totalTip = monthData?.totalKitchenTip || 0;
  const totalHours = monthData?.totalKitchenHours || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Monats-Übersicht ({currentMonthLabel})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {kitchenTips.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            Noch keine Küchenschichten in diesem Monat erfasst.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead className="text-right">Trinkgeld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitchenTips.map((staff) => (
                    <TableRow key={staff.name}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatHours(staff.hours)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-success">
                        {formatCurrency(staff.tip)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-semibold">Gesamt:</span>
              <div className="flex gap-8">
                <span className="tabular-nums font-medium">{formatHours(totalHours)}</span>
                <span className="tabular-nums font-semibold text-success">
                  {formatCurrency(totalTip)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
