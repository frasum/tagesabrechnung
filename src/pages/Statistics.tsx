import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { 
  BarChart3, 
  TrendingUp, 
  Euro, 
  Users, 
  Truck, 
  Receipt,
  Calendar,
  Building2,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStatistics, TimeRange } from '@/hooks/useStatistics';
import { useStatisticsComparison } from '@/hooks/useStatisticsComparison';
import { WaiterTipChart } from '@/components/statistics/WaiterTipChart';
import { KitchenTipChart } from '@/components/statistics/KitchenTipChart';
import { PeriodComparison } from '@/components/statistics/PeriodComparison';
import { RestaurantComparison } from '@/components/statistics/RestaurantComparison';
import { DateRangePicker } from '@/components/statistics/DateRangePicker';
import { MonthlyTipBreakdown } from '@/components/statistics/MonthlyTipBreakdown';
import { useLabels } from '@/hooks/useLabels';
import { useRestaurant, useRestaurants } from '@/hooks/useRestaurant';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k €`;
  }
  return `${value.toFixed(0)} €`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dateStr = payload[0]?.payload?.date;
    if (!dateStr) return null;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">
          {format(new Date(dateStr), 'dd. MMMM yyyy', { locale: de })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// statsMode: restaurant ID for single, 'all' for cumulated, 'compare' for comparison
type StatsMode = string; // restaurant id | 'all' | 'compare'

export default function Statistics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [statsMode, setStatsMode] = useState<StatsMode>('current'); // 'current' = use context restaurant
  
  const customRange = timeRange === 'custom' && customDateRange?.from && customDateRange?.to
    ? { from: customDateRange.from, to: customDateRange.to }
    : undefined;

  const { restaurantId, restaurantName } = useRestaurant();
  const { data: allRestaurants } = useRestaurants();
  const allRestaurantIds = useMemo(() => allRestaurants?.map(r => r.id) ?? [], [allRestaurants]);

  // Resolve the effective single restaurant ID
  const selectedRestaurantId = statsMode === 'current' 
    ? restaurantId 
    : (statsMode !== 'all' && statsMode !== 'compare') 
      ? statsMode 
      : undefined;

  const isMultiMode = statsMode === 'all' || statsMode === 'compare';
  const multiReady = isMultiMode && allRestaurantIds.length > 1;

  const { data, isLoading: statsLoading } = useStatistics(
    timeRange, customRange,
    isMultiMode ? undefined : (selectedRestaurantId || restaurantId),
    multiReady ? allRestaurantIds : undefined
  );
  const { data: comparisonData, isLoading: comparisonLoading } = useStatisticsComparison(
    timeRange, customRange,
    isMultiMode ? undefined : (selectedRestaurantId || restaurantId),
    multiReady ? allRestaurantIds : undefined
  );

  // Compare mode: load each restaurant separately for comparison card
  const restA = allRestaurants?.[0];
  const restB = allRestaurants?.[1];
  const { data: dataA } = useStatistics(timeRange, customRange, statsMode === 'compare' ? restA?.id : null);
  const { data: dataB } = useStatistics(timeRange, customRange, statsMode === 'compare' ? restB?.id : null);

  const isLoading = statsLoading || (isMultiMode && allRestaurantIds.length === 0);

  const { getLabel } = useLabels(restaurantId);

  const handleTimeRangeChange = (value: string) => {
    const newRange = value as TimeRange;
    setTimeRange(newRange);
    // Clear custom date range when switching to preset
    if (newRange !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  const handleCustomDateRangeChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setTimeRange('custom');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-6 lg:p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Statistiken</h1>
                <p className="text-muted-foreground mt-0.5 animate-pulse">Daten werden geladen…</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { dailyStats = [], deliveryBreakdown: rawDeliveryBreakdown = [], summary, waiterTipStats = [], kitchenTipStats = [] } = data || {};

  // Resolve delivery breakdown labels
  const deliveryBreakdown = rawDeliveryBreakdown.map(d => ({
    ...d,
    name: getLabel(d.name as any),
  }));

  // Prepare chart data with formatted dates
  const chartData = dailyStats.map(d => ({
    ...d,
    dateFormatted: format(new Date(d.date), 'dd.MM', { locale: de }),
  }));

  // Tips data for bar chart
  const tipsData = dailyStats.map(d => ({
    date: d.date,
    dateFormatted: format(new Date(d.date), 'dd.MM', { locale: de }),
    'Küchen TG': d.kitchenTip,
    'Mitarbeiter TG': d.waiterTip,
  }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                  Statistiken
                </h1>
                <p className="text-muted-foreground mt-0.5">
                  Umsatz, Trinkgeld und Trends im Überblick
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {allRestaurants && allRestaurants.length > 1 && (
              <Tabs value={statsMode === 'current' ? (restaurantId || '') : statsMode} onValueChange={(v) => setStatsMode(v)}>
                <TabsList>
                  {allRestaurants.map(r => (
                    <TabsTrigger key={r.id} value={r.id} className="gap-1">
                      <Building2 className="w-4 h-4" />
                      {r.name}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="all" className="gap-1">
                    Alle
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="gap-1">
                    Vergleich
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
                <TabsList>
                  <TabsTrigger value="week" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Woche
                  </TabsTrigger>
                  <TabsTrigger value="month" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Monat
                  </TabsTrigger>
                  <TabsTrigger value="3months" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    3 Monate
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Benutzerdefiniert
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {timeRange === 'custom' && (
                <DateRangePicker
                  dateRange={customDateRange}
                  onDateRangeChange={handleCustomDateRangeChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* No Data State */}
        {dailyStats.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                Keine Daten für den gewählten Zeitraum vorhanden.
              </p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Erstellen Sie Sessions und fügen Sie Abrechnungsdaten hinzu.
              </p>
            </CardContent>
          </Card>
        )}

        {dailyStats.length > 0 && (
          <>
            {/* Summary Table */}
            <div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-border/50 bg-card p-4 border-l-4 border-l-primary/40">
                    <p className="text-sm text-muted-foreground">Tage mit Daten</p>
                    <p className="text-2xl font-bold tabular-nums">{summary?.daysWithData || 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4 border-l-4 border-l-success/40">
                    <p className="text-sm text-muted-foreground">Küchen Trinkgeld</p>
                    <p className="text-2xl font-bold tabular-nums text-success">
                      {formatCurrency(summary?.totalKitchenTip || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4 border-l-4 border-l-success/40">
                    <p className="text-sm text-muted-foreground">Service Trinkgeld</p>
                    <p className="text-2xl font-bold tabular-nums text-success">
                      {formatCurrency(summary?.totalWaiterTip || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4 border-l-4 border-l-destructive/40">
                    <p className="text-sm text-muted-foreground">Gesamt Ausgaben</p>
                    <p className="text-2xl font-bold tabular-nums text-destructive">
                      {formatCurrency(summary?.totalExpenses || 0)}
                    </p>
                  </div>
                </div>
            </div>

            {/* Summary Cards with Comparison */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Gesamtumsatz"
                value={summary?.totalRevenue || 0}
                icon={<Euro className="w-5 h-5" />}
                variant="success"
                trend={comparisonData ? {
                  value: comparisonData.changes.revenuePercent,
                  label: comparisonData.previousPeriodLabel,
                } : undefined}
              />
              <StatCard
                label="Ø Tagesumsatz"
                value={summary?.avgDailyRevenue || 0}
                icon={<TrendingUp className="w-5 h-5" />}
                trend={comparisonData ? {
                  value: comparisonData.changes.avgDailyRevenuePercent,
                  label: comparisonData.previousPeriodLabel,
                } : undefined}
              />
              <StatCard
                label="Gesamt Trinkgeld"
                value={(summary?.totalKitchenTip || 0) + (summary?.totalWaiterTip || 0)}
                icon={<Users className="w-5 h-5" />}
                variant="success"
                trend={comparisonData ? {
                  value: ((comparisonData.changes.kitchenTipPercent + comparisonData.changes.waiterTipPercent) / 2),
                  label: comparisonData.previousPeriodLabel,
                } : undefined}
              />
              <StatCard
                label="Lieferumsatz"
                value={summary?.totalDelivery || 0}
                icon={<Truck className="w-5 h-5" />}
                trend={comparisonData ? {
                  value: comparisonData.changes.deliveryPercent,
                  label: comparisonData.previousPeriodLabel,
                } : undefined}
              />
            </div>

            {/* Period Comparison Card */}
            {comparisonData && !comparisonLoading && statsMode !== 'compare' && (
              <PeriodComparison data={comparisonData} />
            )}

            {/* Restaurant Comparison Card (compare mode) */}
            {statsMode === 'compare' && dataA && dataB && restA && restB && (
              <RestaurantComparison restaurants={[
                { name: restA.name, summary: dataA.summary },
                { name: restB.name, summary: dataB.summary },
              ]} />
            )}

            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  Umsatzentwicklung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUmsatz" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBargeld" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTakeaway" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="dateFormatted" 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatShortCurrency}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="kellnerUmsatz" 
                        name="Tagesumsatz"
                        stroke="hsl(var(--chart-1))" 
                        fill="url(#colorUmsatz)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="bargeld" 
                        name="BARGELD"
                        stroke="hsl(var(--chart-2))" 
                        fill="url(#colorBargeld)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="deliveryRevenue" 
                        name="Takeaway"
                        stroke="hsl(var(--chart-3))" 
                        fill="url(#colorTakeaway)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Tips Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    Trinkgeld Verteilung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tipsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="dateFormatted" 
                          className="text-xs fill-muted-foreground"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          className="text-xs fill-muted-foreground"
                          tick={{ fontSize: 11 }}
                          tickFormatter={formatShortCurrency}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="Küchen TG" 
                          fill="hsl(var(--chart-3))" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="Mitarbeiter TG" 
                          fill="hsl(var(--chart-4))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Platforms Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    Lieferplattformen Anteil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deliveryBreakdown.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Keine Lieferplattform-Daten vorhanden
                    </div>
                  ) : (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deliveryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={true}
                            fontSize={13}
                          >
                            {deliveryBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  {/* Legend */}
                  {deliveryBreakdown.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <div className="flex flex-wrap justify-center gap-4">
                        {deliveryBreakdown.map((entry, index) => {
                          const total = deliveryBreakdown.reduce((sum, d) => sum + d.value, 0);
                          const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                          return (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm text-muted-foreground">{entry.name}</span>
                              <span className="text-sm font-medium tabular-nums">
                                {formatCurrency(entry.value)} ({percent}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center border-t pt-2">
                        <span className="text-sm text-muted-foreground">Gesamt Takeaway: </span>
                        <span className="text-sm font-bold tabular-nums">
                          {formatCurrency(deliveryBreakdown.reduce((sum, d) => sum + d.value, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Staff Tip Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <WaiterTipChart data={waiterTipStats} />
              <KitchenTipChart data={kitchenTipStats} />
            </div>

            {/* Monthly Tip Breakdown */}
            <MonthlyTipBreakdown />
          </>
        )}
      </div>
    </AppLayout>
  );
}
