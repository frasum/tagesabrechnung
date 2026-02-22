import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, Users, ChefHat } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthlyStaffTips, MonthlyTipData } from '@/hooks/useMonthlyStaffTips';
import { useRestaurant } from '@/hooks/useRestaurant';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatHours = (hours: number) => {
  return `${hours.toFixed(1)} Std.`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-success font-medium tabular-nums">
          {formatCurrency(data.tip)}
        </p>
        {data.hours > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatHours(data.hours)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

interface TipChartProps {
  data: { name: string; tip: number; hours: number }[];
  title: string;
}

function TipChart({ data, title }: TipChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Daten für diesen Monat vorhanden
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v.toFixed(0)} €`}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs fill-muted-foreground"
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="tip" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TipTableProps {
  data: { name: string; tip: number; hours: number }[];
  showHours: boolean;
}

function TipTable({ data, showHours }: TipTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-6">
        Keine Daten für diesen Monat vorhanden
      </p>
    );
  }

  const total = data.reduce((sum, d) => sum + d.tip, 0);
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              {showHours && <TableHead className="text-right">Stunden</TableHead>}
              <TableHead className="text-right">Trinkgeld</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((staff, index) => (
              <TableRow key={staff.name}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{staff.name}</TableCell>
                {showHours && (
                  <TableCell className="text-right tabular-nums">
                    {formatHours(staff.hours)}
                  </TableCell>
                )}
                <TableCell className="text-right tabular-nums font-medium text-success">
                  {formatCurrency(staff.tip)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <span className="font-semibold">Gesamt:</span>
        <div className="flex gap-8">
          {showHours && (
            <span className="tabular-nums font-medium">{formatHours(totalHours)}</span>
          )}
          <span className="tabular-nums font-semibold text-success">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </>
  );
}

export function MonthlyTipBreakdown() {
  const { restaurantId } = useRestaurant();
  const { data: monthlyData, isLoading } = useMonthlyStaffTips(12, restaurantId);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'waiter' | 'kitchen'>('waiter');

  // Get current month as default
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Set default selected month when data loads
  const effectiveMonth = selectedMonth || currentMonth;

  const selectedMonthData = useMemo(() => {
    if (!monthlyData) return null;
    return monthlyData.find(m => m.month === effectiveMonth) || monthlyData[0] || null;
  }, [monthlyData, effectiveMonth]);

  const availableMonths = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.map(m => ({
      value: m.month,
      label: m.monthLabel,
    }));
  }, [monthlyData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <Skeleton className="h-6 w-64" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Monatliche Trinkgeld-Auswertung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Noch keine Trinkgeld-Daten vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Monatliche Trinkgeld-Auswertung
          </CardTitle>
          
          <Select
            value={effectiveMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Monat wählen" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'waiter' | 'kitchen')}>
          <TabsList className="mb-4">
            <TabsTrigger value="waiter" className="gap-2">
              <Users className="w-4 h-4" />
              Mitarbeiter
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="gap-2">
              <ChefHat className="w-4 h-4" />
              Küche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waiter" className="space-y-6">
            <TipChart
              data={selectedMonthData?.waiterTips || []}
              title="Mitarbeiter Trinkgeld"
            />
            <TipTable
              data={selectedMonthData?.waiterTips || []}
              showHours={false}
            />
          </TabsContent>

          <TabsContent value="kitchen" className="space-y-6">
            <TipChart
              data={selectedMonthData?.kitchenTips || []}
              title="Küchen Trinkgeld"
            />
            <TipTable
              data={selectedMonthData?.kitchenTips || []}
              showHours={true}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
