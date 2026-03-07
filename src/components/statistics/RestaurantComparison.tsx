import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { StatsSummary } from '@/hooks/useStatistics';

interface RestaurantComparisonProps {
  restaurants: { name: string; summary: StatsSummary }[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const formatPercent = (val: number) => {
  if (!isFinite(val)) return '–';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

interface MetricRowProps {
  label: string;
  values: number[];
  names: string[];
  invert?: boolean;
}

function MetricRow({ label, values, names, invert = false }: MetricRowProps) {
  const [a, b] = values;
  const max = Math.max(...values.map(Math.abs));
  const diff = b !== 0 ? ((a - b) / Math.abs(b)) * 100 : 0;
  // For inverted metrics (expenses), lower is better
  const effectiveDiff = invert ? -diff : diff;

  return (
    <div className="py-4 border-b last:border-b-0 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-1.5 text-xs">
          {effectiveDiff > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : effectiveDiff < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={`tabular-nums font-medium ${effectiveDiff > 0 ? 'text-success' : effectiveDiff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatPercent(diff)}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {values.map((v, i) => {
          const proportion = max > 0 ? (Math.abs(v) / max) * 100 : 0;
          const isLeading = Math.abs(v) === max && max > 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{names[i]}</span>
              <div className="flex-1">
                <Progress value={proportion} className="h-2" />
              </div>
              <span className={`text-sm tabular-nums w-24 text-right shrink-0 ${isLeading ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {formatCurrency(v)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RestaurantComparison({ restaurants }: RestaurantComparisonProps) {
  if (restaurants.length < 2) return null;

  const names = restaurants.map(r => r.name);
  const metrics: { label: string; key: keyof StatsSummary; invert?: boolean }[] = [
    { label: 'Gesamtumsatz', key: 'totalRevenue' },
    { label: 'Ø Tagesumsatz', key: 'avgDailyRevenue' },
    { label: 'Küchen Trinkgeld', key: 'totalKitchenTip' },
    { label: 'Service Trinkgeld', key: 'totalWaiterTip' },
    { label: 'Lieferumsatz', key: 'totalDelivery' },
    { label: 'Ausgaben', key: 'totalExpenses', invert: true },
  ];

  // Derived metrics
  const avgTipPerDayA = restaurants[0].summary.daysWithData > 0
    ? (restaurants[0].summary.totalKitchenTip + restaurants[0].summary.totalWaiterTip) / restaurants[0].summary.daysWithData
    : 0;
  const avgTipPerDayB = restaurants[1].summary.daysWithData > 0
    ? (restaurants[1].summary.totalKitchenTip + restaurants[1].summary.totalWaiterTip) / restaurants[1].summary.daysWithData
    : 0;
  const avgExpPerDayA = restaurants[0].summary.daysWithData > 0
    ? restaurants[0].summary.totalExpenses / restaurants[0].summary.daysWithData
    : 0;
  const avgExpPerDayB = restaurants[1].summary.daysWithData > 0
    ? restaurants[1].summary.totalExpenses / restaurants[1].summary.daysWithData
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          Restaurant-Vergleich
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.map(m => (
          <MetricRow
            key={m.key}
            label={m.label}
            values={restaurants.map(r => r.summary[m.key] as number)}
            names={names}
            invert={m.invert}
          />
        ))}

        {/* Derived metrics */}
        <MetricRow
          label="Ø Trinkgeld / Tag"
          values={[avgTipPerDayA, avgTipPerDayB]}
          names={names}
        />
        <MetricRow
          label="Ø Ausgaben / Tag"
          values={[avgExpPerDayA, avgExpPerDayB]}
          names={names}
          invert
        />

        {/* Days */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          {restaurants.map(r => (
            <div key={r.name} className="text-center">
              <span className="text-xs text-muted-foreground block">{r.name}</span>
              <span className="text-lg font-bold tabular-nums">{r.summary.daysWithData}</span>
              <span className="text-xs text-muted-foreground block">Tage</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
