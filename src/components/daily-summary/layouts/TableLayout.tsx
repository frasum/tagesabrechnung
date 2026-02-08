import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TableLayoutProps {
  statCards: ReactNode;
  warnings: ReactNode;
  revenueCard: ReactNode;
  deductionsCard: ReactNode;
  tipsCard: ReactNode;
  waiterStatus: ReactNode;
  expenses: ReactNode;
  cashBalanceCard: ReactNode;
  formData: {
    pos_total: number;
    terminal_1_total: number;
    terminal_2_total: number;
    card_total_gl: number;
    takeaway_total: number;
    ordersmart_revenue: number;
    wolt_revenue: number;
    vouchers_sold: number;
    vouchers_redeemed: number;
    finedine_vouchers: number;
    vorschuss: number;
    einladung: number;
    sonstige_einnahme: number;
    notes: string;
  };
  onFieldChange: (field: string, value: number | string) => void;
}

export function TableLayout({
  statCards,
  warnings,
  revenueCard,
  deductionsCard,
  tipsCard,
  waiterStatus,
  expenses,
  cashBalanceCard,
  formData,
  onFieldChange,
}: TableLayoutProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const inputRows = [
    { label: 'Vectron Gesamtumsatz', field: 'pos_total', value: formData.pos_total },
    { label: 'Terminal 1', field: 'terminal_1_total', value: formData.terminal_1_total },
    { label: 'Terminal 2', field: 'terminal_2_total', value: formData.terminal_2_total },
    { label: 'Kreditkartenumsatz GL', field: 'card_total_gl', value: formData.card_total_gl },
    { label: 'Takeaway GL', field: 'takeaway_total', value: formData.takeaway_total },
    { label: 'OrderSmart', field: 'ordersmart_revenue', value: formData.ordersmart_revenue },
    { label: 'Wolt', field: 'wolt_revenue', value: formData.wolt_revenue },
    { label: 'Gutschein Verkauf', field: 'vouchers_sold', value: formData.vouchers_sold },
    { label: 'Gutschein Eingelöst', field: 'vouchers_redeemed', value: formData.vouchers_redeemed },
    { label: 'FineDine', field: 'finedine_vouchers', value: formData.finedine_vouchers },
    { label: 'Vorschuss', field: 'vorschuss', value: formData.vorschuss },
    { label: 'Einladung', field: 'einladung', value: formData.einladung },
    { label: 'Sonstige Einnahmen', field: 'sonstige_einnahme', value: formData.sonstige_einnahme },
  ];

  return (
    <div className="space-y-6">
      {warnings}
      {statCards}

      {/* Compact Table Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Tageseingaben</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {inputRows.map((row) => (
                <TableRow key={row.field}>
                  <TableCell className="py-2 font-medium w-1/3">{row.label}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums w-1/3">
                    {formatCurrency(row.value)}
                  </TableCell>
                  <TableCell className="py-2 w-1/3">
                    <CurrencyInput
                      value={row.value}
                      onChange={(v) => onFieldChange(row.field, v)}
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notizen für diesen Tag..."
            value={formData.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {revenueCard}
        {deductionsCard}
        {tipsCard}
      </div>

      {/* Status Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {waiterStatus}
        {cashBalanceCard}
        {expenses}
      </div>
    </div>
  );
}
