import { User } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { WaiterTipStats } from '@/hooks/useStatistics';

interface WaiterTipChartProps {
  data: WaiterTipStats[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as WaiterTipStats;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pool-Anteil gesamt:</span>
            <span className="font-medium tabular-nums">{formatCurrency(data.totalTip)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Schichten:</span>
            <span className="font-medium tabular-nums">{data.shiftsCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ø Pool-Anteil/Schicht:</span>
            <span className="font-medium tabular-nums">{formatCurrency(data.avgTipPerShift)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function WaiterTipChart({ data }: WaiterTipChartProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Kellner Trinkgeld
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Keine Kellner-Daten vorhanden
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 10); // Show top 10

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Kellner Trinkgeld
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
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.totalTip >= 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))'} 
                  />
                ))}
              </Bar>
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
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-right p-2 font-medium">Schichten</th>
                    <th className="text-right p-2 font-medium">Pool-Anteil</th>
                    <th className="text-right p-2 font-medium">Ø/Schicht</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((waiter, index) => (
                    <tr key={waiter.name} className="border-t">
                      <td className="p-2 text-muted-foreground">{index + 1}</td>
                      <td className="p-2 font-medium">{waiter.name}</td>
                      <td className="p-2 text-right tabular-nums">{waiter.shiftsCount}</td>
                      <td className={`p-2 text-right tabular-nums font-medium ${waiter.totalTip >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(waiter.totalTip)}
                      </td>
                      <td className={`p-2 text-right tabular-nums ${waiter.avgTipPerShift >= 0 ? '' : 'text-destructive'}`}>
                        {formatCurrency(waiter.avgTipPerShift)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}