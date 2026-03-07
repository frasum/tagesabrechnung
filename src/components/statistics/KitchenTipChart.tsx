import { ChefHat } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { KitchenTipStats } from '@/hooks/useStatistics';

interface KitchenTipChartProps {
  data: KitchenTipStats[];
  restaurantNames?: Record<string, string>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatHours = (hours: number) => {
  return `${hours.toFixed(1)} Std.`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as KitchenTipStats;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gesamt TG:</span>
            <span className="font-medium tabular-nums">{formatCurrency(data.totalTip)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Stunden:</span>
            <span className="font-medium tabular-nums">{formatHours(data.totalHours)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">TG/Std.:</span>
            <span className="font-medium tabular-nums">{formatCurrency(data.avgTipPerHour)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function KitchenTipChart({ data, restaurantNames }: KitchenTipChartProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasGroups = useMemo(() => data.some(d => d.restaurantId), [data]);
  const grouped = useMemo(() => {
    if (!hasGroups || !restaurantNames) return null;
    const groups: Record<string, KitchenTipStats[]> = {};
    for (const entry of data) {
      const key = entry.restaurantId || '_';
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    return Object.entries(groups)
      .map(([id, items]) => ({ id, name: restaurantNames[id] || id, items: items.sort((a, b) => b.totalTip - a.totalTip) }))
      .sort((a, b) => b.items.reduce((s, i) => s + i.totalTip, 0) - a.items.reduce((s, i) => s + i.totalTip, 0));
  }, [data, hasGroups, restaurantNames]);
  
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Küchen Trinkgeld
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Keine Küchen-Daten vorhanden
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 10); // Show top 10

  const renderTable = (items: KitchenTipStats[]) => (
    <table className="w-full text-sm">
      <thead className="bg-muted">
        <tr>
          <th className="text-left p-2 font-medium">#</th>
          <th className="text-left p-2 font-medium">Name</th>
          <th className="text-right p-2 font-medium">Stunden</th>
          <th className="text-right p-2 font-medium">Trinkgeld</th>
          <th className="text-right p-2 font-medium">TG/Std.</th>
        </tr>
      </thead>
      <tbody>
        {items.map((staff, index) => (
          <tr key={`${staff.restaurantId}_${staff.name}`} className="border-t">
            <td className="p-2 text-muted-foreground">{index + 1}</td>
            <td className="p-2 font-medium">{staff.name}</td>
            <td className="p-2 text-right tabular-nums">{formatHours(staff.totalHours)}</td>
            <td className="p-2 text-right tabular-nums font-medium text-success">
              {formatCurrency(staff.totalTip)}
            </td>
            <td className="p-2 text-right tabular-nums">
              {formatCurrency(staff.avgTipPerHour)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          Küchen Trinkgeld
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(0)} €`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalTip" 
                fill="hsl(var(--chart-3))" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              Details anzeigen
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {grouped ? (
              <div className="space-y-4">
                {grouped.map((group) => (
                  <div key={group.id}>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 px-2">{group.name}</h4>
                    <div className="rounded-lg border overflow-hidden">
                      {renderTable(group.items)}
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurantNames ? (
              <div className="space-y-4">
                {(() => {
                  const groups: Record<string, KitchenTipStats[]> = {};
                  for (const entry of data) {
                    const key = entry.restaurantId || '_unknown';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(entry);
                  }
                  return Object.entries(groups)
                    .sort(([, a], [, b]) => b.reduce((s, i) => s + i.totalTip, 0) - a.reduce((s, i) => s + i.totalTip, 0))
                    .map(([id, items]) => (
                      <div key={id}>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 px-2">{restaurantNames[id] || id}</h4>
                        <div className="rounded-lg border overflow-hidden">
                          {renderTable(items.sort((a, b) => b.totalTip - a.totalTip))}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                {renderTable(data)}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
