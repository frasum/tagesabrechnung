import { useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { DailyStats } from '@/hooks/useStatistics';

interface RestaurantOverlayChartProps {
  nameA: string;
  nameB: string;
  dailyStatsA: DailyStats[];
  dailyStatsB: DailyStats[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const formatShortCurrency = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${value.toFixed(0)} €`;
};

export function RestaurantOverlayChart({ nameA, nameB, dailyStatsA, dailyStatsB }: RestaurantOverlayChartProps) {
  const mergedData = useMemo(() => {
    const map = new Map<string, { date: string; dateFormatted: string; valueA?: number; valueB?: number }>();

    for (const d of dailyStatsA) {
      map.set(d.date, {
        date: d.date,
        dateFormatted: format(new Date(d.date), 'dd.MM', { locale: de }),
        valueA: d.kellnerUmsatz,
      });
    }
    for (const d of dailyStatsB) {
      const existing = map.get(d.date);
      if (existing) {
        existing.valueB = d.kellnerUmsatz;
      } else {
        map.set(d.date, {
          date: d.date,
          dateFormatted: format(new Date(d.date), 'dd.MM', { locale: de }),
          valueB: d.kellnerUmsatz,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyStatsA, dailyStatsB]);

  if (mergedData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          Umsatzvergleich
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
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
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-foreground mb-2">
                        {item?.date ? format(new Date(item.date), 'dd. MMMM yyyy', { locale: de }) : ''}
                      </p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}:</span>
                          <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="valueA"
                name={nameA}
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'hsl(var(--chart-1))' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="valueB"
                name={nameB}
                stroke="hsl(var(--chart-2))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
