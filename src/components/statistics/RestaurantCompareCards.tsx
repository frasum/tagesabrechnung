import { Euro, TrendingUp, Users, Truck } from 'lucide-react';
import type { StatsSummary } from '@/hooks/useStatistics';

interface RestaurantCompareCardsProps {
  nameA: string;
  nameB: string;
  summaryA: StatsSummary;
  summaryB: StatsSummary;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const formatPercent = (val: number) => {
  if (!isFinite(val)) return '–';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

interface CompareCardProps {
  label: string;
  icon: React.ReactNode;
  valueA: number;
  valueB: number;
  nameA: string;
  nameB: string;
}

function CompareCard({ label, icon, valueA, valueB, nameA, nameB }: CompareCardProps) {
  const diff = valueB !== 0 ? ((valueA - valueB) / Math.abs(valueB)) * 100 : 0;
  const leading = valueA > valueB ? 'A' : valueA < valueB ? 'B' : 'tie';

  return (
    <div className="rounded-lg border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{nameA}</span>
          <span className={`text-lg font-semibold tabular-nums ${leading === 'A' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {formatCurrency(valueA)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{nameB}</span>
          <span className={`text-lg font-semibold tabular-nums ${leading === 'B' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {formatCurrency(valueB)}
          </span>
        </div>
        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Differenz</span>
          <span className={`text-sm font-medium tabular-nums ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatPercent(diff)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RestaurantCompareCards({ nameA, nameB, summaryA, summaryB }: RestaurantCompareCardsProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <CompareCard
        label="Gesamtumsatz"
        icon={<Euro className="w-5 h-5" />}
        valueA={summaryA.totalRevenue}
        valueB={summaryB.totalRevenue}
        nameA={nameA}
        nameB={nameB}
      />
      <CompareCard
        label="Ø Tagesumsatz"
        icon={<TrendingUp className="w-5 h-5" />}
        valueA={summaryA.avgDailyRevenue}
        valueB={summaryB.avgDailyRevenue}
        nameA={nameA}
        nameB={nameB}
      />
      <CompareCard
        label="Gesamt Trinkgeld"
        icon={<Users className="w-5 h-5" />}
        valueA={summaryA.totalKitchenTip + summaryA.totalWaiterTip}
        valueB={summaryB.totalKitchenTip + summaryB.totalWaiterTip}
        nameA={nameA}
        nameB={nameB}
      />
      <CompareCard
        label="Lieferumsatz"
        icon={<Truck className="w-5 h-5" />}
        valueA={summaryA.totalDelivery}
        valueB={summaryB.totalDelivery}
        nameA={nameA}
        nameB={nameB}
      />
    </div>
  );
}
