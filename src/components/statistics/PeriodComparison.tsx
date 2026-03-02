import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComparisonData {
  current: {
    totalRevenue: number;
    avgDailyRevenue: number;
    totalKitchenTip: number;
    totalWaiterTip: number;
    totalDelivery: number;
    totalExpenses: number;
    daysWithData: number;
  };
  previous: {
    totalRevenue: number;
    avgDailyRevenue: number;
    totalKitchenTip: number;
    totalWaiterTip: number;
    totalDelivery: number;
    totalExpenses: number;
    daysWithData: number;
  };
  changes: {
    revenue: number;
    revenuePercent: number;
    avgDailyRevenue: number;
    avgDailyRevenuePercent: number;
    kitchenTip: number;
    kitchenTipPercent: number;
    waiterTip: number;
    waiterTipPercent: number;
    delivery: number;
    deliveryPercent: number;
    expenses: number;
    expensesPercent: number;
  };
  currentPeriodLabel: string;
  previousPeriodLabel: string;
}

interface PeriodComparisonProps {
  data: ComparisonData;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

interface MetricRowProps {
  label: string;
  current: number;
  previous: number;
  change: number;
  percentChange: number;
  invertColors?: boolean; // For expenses where lower is better
}

function MetricRow({ label, current, previous, change, percentChange, invertColors = false }: MetricRowProps) {
  const isPositive = invertColors ? change < 0 : change > 0;
  const isNegative = invertColors ? change > 0 : change < 0;
  const isNeutral = change === 0;

  return (
    <div className="grid grid-cols-4 gap-4 items-center py-3 border-b last:border-b-0">
      <div className="font-medium text-sm">{label}</div>
      <div className="text-right tabular-nums text-muted-foreground text-sm">
        {formatCurrency(previous)}
      </div>
      <div className="text-right tabular-nums font-medium text-sm">
        {formatCurrency(current)}
      </div>
      <div className="flex items-center justify-end gap-2">
        {isPositive && <TrendingUp className="w-4 h-4 text-success" />}
        {isNegative && <TrendingDown className="w-4 h-4 text-destructive" />}
        {isNeutral && <Minus className="w-4 h-4 text-muted-foreground" />}
        <span className={`text-sm font-medium tabular-nums ${
          isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {formatPercent(percentChange)}
        </span>
      </div>
    </div>
  );
}

export function PeriodComparison({ data }: PeriodComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          Zeitraumvergleich
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span className="bg-muted px-2 py-1 rounded">{data.previousPeriodLabel}</span>
          <ArrowRight className="w-4 h-4" />
          <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">{data.currentPeriodLabel}</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header Row */}
        <div className="grid grid-cols-4 gap-4 pb-2 border-b-2 mb-2">
          <div className="text-sm font-medium text-muted-foreground">Kennzahl</div>
          <div className="text-right text-sm font-medium text-muted-foreground">{data.previousPeriodLabel}</div>
          <div className="text-right text-sm font-medium text-muted-foreground">{data.currentPeriodLabel}</div>
          <div className="text-right text-sm font-medium text-muted-foreground">Änderung</div>
        </div>

        <MetricRow
          label="Gesamtumsatz"
          current={data.current.totalRevenue}
          previous={data.previous.totalRevenue}
          change={data.changes.revenue}
          percentChange={data.changes.revenuePercent}
        />
        <MetricRow
          label="Ø Tagesumsatz"
          current={data.current.avgDailyRevenue}
          previous={data.previous.avgDailyRevenue}
          change={data.changes.avgDailyRevenue}
          percentChange={data.changes.avgDailyRevenuePercent}
        />
        <MetricRow
          label="Küchen TG"
          current={data.current.totalKitchenTip}
          previous={data.previous.totalKitchenTip}
          change={data.changes.kitchenTip}
          percentChange={data.changes.kitchenTipPercent}
        />
        <MetricRow
          label="Mitarbeiter TG Pool"
          current={data.current.totalWaiterTip}
          previous={data.previous.totalWaiterTip}
          change={data.changes.waiterTip}
          percentChange={data.changes.waiterTipPercent}
        />
        <MetricRow
          label="Lieferumsatz"
          current={data.current.totalDelivery}
          previous={data.previous.totalDelivery}
          change={data.changes.delivery}
          percentChange={data.changes.deliveryPercent}
        />
        <MetricRow
          label="Ausgaben"
          current={data.current.totalExpenses}
          previous={data.previous.totalExpenses}
          change={data.changes.expenses}
          percentChange={data.changes.expensesPercent}
          invertColors={true}
        />

        {/* Days comparison */}
        <div className="mt-4 pt-4 border-t flex justify-between text-sm">
          <span className="text-muted-foreground">Tage mit Daten:</span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{data.previous.daysWithData}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="tabular-nums font-medium">{data.current.daysWithData}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
