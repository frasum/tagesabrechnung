import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Landmark, Plus, Wallet, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { PettyCashSetting } from './PettyCashSetting';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatSigned = (value: number) => {
  if (value > 0) return `+${formatCurrency(value)}`;
  return formatCurrency(value);
};

interface CashBalanceSummaryProps {
  totalCash: number;
  totalDeposits: number;
  pettyCash: number;
  wechselgeldbestand: number;
  latestDeposit: { deposit_date: string; amount: number } | null;
  monthLabel?: string;
  previousMonthLabel?: string;
  previousMonthCarryOver?: number;
  restaurantName?: string;
  referenceDate?: Date | string;
  onAddDeposit: () => void;
}

interface InfoLabelProps {
  label: React.ReactNode;
  hint: string;
  className?: string;
}

function InfoLabel({ label, hint, className }: InfoLabelProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help text-muted-foreground', className)}>
            {label}
            <Info className="h-3 w-3 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CashBalanceSummary({
  totalCash,
  totalDeposits,
  pettyCash,
  wechselgeldbestand,
  latestDeposit,
  monthLabel,
  previousMonthLabel,
  previousMonthCarryOver = 0,
  restaurantName,
  referenceDate,
  onAddDeposit,
}: CashBalanceSummaryProps) {
  const refDateObj =
    referenceDate instanceof Date
      ? referenceDate
      : referenceDate
        ? parseISO(referenceDate)
        : null;
  const formattedRefDate = refDateObj ? format(refDateObj, 'dd.MM.yyyy', { locale: de }) : null;
  // wechselgeldbestand from CashBalance.tsx is already pettyCash + cumulative remainingCash,
  // i.e. the physical cash currently in the till.
  const physical = wechselgeldbestand;
  const operative = physical - pettyCash;
  const monthEndBalance = previousMonthCarryOver + totalCash - totalDeposits;
  // Maximum amount that can be deposited without touching the change fund
  const possibleDeposit = Math.max(0, physical - pettyCash);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Aktueller Bargeldbestand
              {restaurantName && (
                <span className="text-muted-foreground font-normal"> · {restaurantName}</span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formattedRefDate
                ? `Stand: bis einschließlich ${formattedRefDate}`
                : 'Physisch in der Kasse + Aufschlüsselung'}
            </p>
          </div>
        </div>

        {/* Hero + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hero: physical cash */}
          <div className="rounded-lg border border-primary/20 bg-background/40 p-5 flex flex-col justify-center">
            <InfoLabel
              label="Physisch in der Kasse"
              hint="Tatsächlich in der Kassenschublade vorhandenes Bargeld (Wechselgeld-Sockel + operativer Saldo)."
              className="text-xs uppercase tracking-wide font-medium"
            />
            <p
              className={cn(
                'mt-2 text-4xl font-bold tabular-nums',
                physical >= 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {formatCurrency(physical)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-border bg-background/40 p-5 space-y-3">
            <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
              Aufschlüsselung
            </div>

            <div className="flex items-center justify-between text-sm">
              <InfoLabel
                label="Wechselgeld-Sockel"
                hint="Fester Bargeldbestand, der immer in der Kasse verbleibt."
              />
              <PettyCashSetting />
            </div>

            <div className="flex items-center justify-between text-sm">
              <InfoLabel
                label="Operativer Saldo"
                hint="Kumulierter Tageskassen-Überschuss bzw. -Defizit seit Aufzeichnungsbeginn (nach allen Bankeinzahlungen und Transfers)."
              />
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  operative >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatSigned(operative)}
              </span>
            </div>

            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-sm font-medium">Physisch</span>
              <span
                className={cn(
                  'text-base font-bold tabular-nums',
                  physical >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatCurrency(physical)}
              </span>
            </div>
          </div>
        </div>

        {/* Monatsbewegung */}
        <div className="rounded-lg border border-border bg-background/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Monatsbewegung {monthLabel ?? ''}
            </h3>
            <Button onClick={onAddDeposit} size="sm" className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              BANKEINZAHLUNG
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            {previousMonthLabel && (
              <div className="flex items-center justify-between">
                <InfoLabel
                  label={`Übertrag aus ${previousMonthLabel}`}
                  hint="Physischer Kassenbestand am letzten Tag des Vormonats (inkl. Wechselgeld-Sockel)."
                />
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    previousMonthCarryOver >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {formatSigned(previousMonthCarryOver)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <InfoLabel
                label="Bargeldzufluss"
                hint="Summe der täglichen Bargeldbeträge des laufenden Monats (vor Bankeinzahlungen)."
              />
              <span
                className={cn(
                  'font-medium tabular-nums',
                  totalCash >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatSigned(totalCash)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <InfoLabel
                  label={
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="h-3 w-3" /> Bankeinzahlungen
                    </span>
                  }
                  hint={`Summe der Bankeinzahlungen des laufenden Monats. Maximal mögliche Einzahlung heute: ${formatCurrency(possibleDeposit)} (Wechselgeld-Sockel von ${formatCurrency(pettyCash)} bleibt erhalten).`}
                />
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    possibleDeposit <= 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}
                >
                  (mögl. Einzahlung: {formatCurrency(possibleDeposit)})
                </span>
              </div>
              <span className="font-medium tabular-nums text-destructive">
                {totalDeposits === 0 ? formatCurrency(0) : `-${formatCurrency(totalDeposits)}`}
              </span>
            </div>

            <div className="border-t border-border pt-2 flex items-center justify-between">
              <InfoLabel
                label="Saldo Ende Monat"
                hint="Übertrag Vormonat + Bargeldzufluss − Bankeinzahlungen."
                className="text-sm font-semibold text-foreground"
              />
              <span
                className={cn(
                  'text-base font-bold tabular-nums',
                  monthEndBalance >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatCurrency(monthEndBalance)}
              </span>
            </div>
          </div>

          {latestDeposit && (
            <p className="mt-3 text-xs text-muted-foreground">
              Letzte Einzahlung:{' '}
              {format(parseISO(latestDeposit.deposit_date), 'dd.MM.yyyy', { locale: de })} ·{' '}
              {formatCurrency(latestDeposit.amount)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
