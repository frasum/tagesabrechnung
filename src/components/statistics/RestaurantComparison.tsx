import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface MetricDef {
  label: string;
  valA: number;
  valB: number;
  invert?: boolean;
}

function MetricCard({ label, valA, valB, nameA, nameB, invert }: MetricDef & { nameA: string; nameB: string }) {
  const total = Math.abs(valA) + Math.abs(valB);
  const ratioA = total > 0 ? (Math.abs(valA) / total) * 100 : 50;
  const ratioB = total > 0 ? (Math.abs(valB) / total) * 100 : 50;
  const rawDiff = valB !== 0 ? ((valA - valB) / Math.abs(valB)) * 100 : 0;
  const effectiveDiff = invert ? -rawDiff : rawDiff;
  const leadA = Math.abs(valA) > Math.abs(valB);
  const leadB = Math.abs(valB) > Math.abs(valA);
  const tie = Math.abs(valA) === Math.abs(valB);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      {/* Header: label + diff badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {effectiveDiff > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : effectiveDiff < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 font-semibold ${
              effectiveDiff > 0
                ? 'border-success/30 text-success bg-success/10'
                : effectiveDiff < 0
                  ? 'border-destructive/30 text-destructive bg-destructive/10'
                  : 'text-muted-foreground'
            }`}
          >
            {formatPercent(rawDiff)}
          </Badge>
        </div>
      </div>

      {/* Values: left vs right */}
      <div className="flex items-end justify-between gap-2">
        <div className="text-left space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-1))] shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{nameA}</span>
          </div>
          <span className={`tabular-nums block ${leadA ? 'text-lg font-bold text-foreground' : 'text-sm text-muted-foreground'}`}>
            {formatCurrency(valA)}
          </span>
        </div>

        {tie ? (
          <span className="text-[10px] text-muted-foreground font-medium pb-1">=</span>
        ) : (
          <span className="text-[10px] text-muted-foreground font-medium pb-1">vs</span>
        )}

        <div className="text-right space-y-0.5">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[11px] text-muted-foreground truncate">{nameB}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-2))] shrink-0" />
          </div>
          <span className={`tabular-nums block ${leadB ? 'text-lg font-bold text-foreground' : 'text-sm text-muted-foreground'}`}>
            {formatCurrency(valB)}
          </span>
        </div>
      </div>

      {/* Split bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        <div
          className="h-full bg-[hsl(var(--chart-1))] transition-all duration-500 rounded-l-full"
          style={{ width: `${ratioA}%` }}
        />
        <div
          className="h-full bg-[hsl(var(--chart-2))] transition-all duration-500 rounded-r-full"
          style={{ width: `${ratioB}%` }}
        />
      </div>
    </div>
  );
}

export function RestaurantComparison({ restaurants }: RestaurantComparisonProps) {
  const a = restaurants[0];
  const b = restaurants[1];
  const nameA = a?.name ?? '';
  const nameB = b?.name ?? '';

  const metrics = useMemo<MetricDef[]>(() => {
    if (!a || !b) return [];
    const sa = a.summary;
    const sb = b.summary;
    const dA = sa.daysWithData || 1;
    const dB = sb.daysWithData || 1;
    return [
      { label: 'Gesamtumsatz', valA: sa.totalRevenue, valB: sb.totalRevenue },
      { label: 'Ø Tagesumsatz', valA: sa.avgDailyRevenue, valB: sb.avgDailyRevenue },
      { label: 'Küchen Trinkgeld', valA: sa.totalKitchenTip, valB: sb.totalKitchenTip },
      { label: 'Service Trinkgeld', valA: sa.totalWaiterTip, valB: sb.totalWaiterTip },
      { label: 'Lieferumsatz', valA: sa.totalDelivery, valB: sb.totalDelivery },
      { label: 'Ausgaben', valA: sa.totalExpenses, valB: sb.totalExpenses, invert: true },
      { label: 'Ø Trinkgeld / Tag', valA: (sa.totalKitchenTip + sa.totalWaiterTip) / dA, valB: (sb.totalKitchenTip + sb.totalWaiterTip) / dB },
      { label: 'Ø Ausgaben / Tag', valA: sa.totalExpenses / dA, valB: sb.totalExpenses / dB, invert: true },
    ];
  }, [a, b]);

  if (!a || !b) return null;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} nameA={nameA} nameB={nameB} />
        ))}

        {/* Days card */}
        <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-around sm:col-span-2">
          {restaurants.map((r, i) => (
            <div key={r.name} className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-[hsl(var(--chart-1))]' : 'bg-[hsl(var(--chart-2))]'}`} />
                <span className="text-xs text-muted-foreground">{r.name}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xl font-bold tabular-nums text-foreground">{r.summary.daysWithData}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Tage mit Daten</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
