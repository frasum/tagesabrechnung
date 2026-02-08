import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Landmark, Plus, TrendingDown, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

interface CashBalanceSummaryProps {
  totalCash: number;
  totalDeposits: number;
  latestDeposit: { deposit_date: string; amount: number } | null;
  onAddDeposit: () => void;
}

export function CashBalanceSummary({
  totalCash,
  totalDeposits,
  latestDeposit,
  onAddDeposit,
}: CashBalanceSummaryProps) {
  const remainingCash = totalCash - totalDeposits;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Aktueller Kassenbestand</h2>
                <p className="text-sm text-muted-foreground">Bargeld abzüglich Bankeinzahlungen</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bargeld gesamt</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {formatCurrency(totalCash)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    Bankeinzahlungen
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-destructive">
                    -{formatCurrency(totalDeposits)}
                  </p>
                </div>
                <div>
                  <Separator orientation="horizontal" className="sm:hidden mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Verbleibendes Bargeld</p>
                  <p className={`text-2xl font-bold tabular-nums ${remainingCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {formatCurrency(remainingCash)}
                  </p>
                </div>
              </div>

              {latestDeposit && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Letzte Einzahlung: {format(parseISO(latestDeposit.deposit_date), 'dd.MM.yyyy', { locale: de })} - {formatCurrency(latestDeposit.amount)}
                </p>
              )}
            </div>
          </div>

          <Button onClick={onAddDeposit} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Einzahlung hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
