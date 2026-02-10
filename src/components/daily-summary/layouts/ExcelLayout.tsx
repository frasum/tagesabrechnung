import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { LabelKey } from '@/hooks/useLabels';

interface WaiterShiftData {
  id: string;
  waiter_name: string;
  kassiert_brutto: number | null;
  card_total: number | null;
  hilf_mahl: number | null;
  open_invoices: number | null;
  cash_handed_in: number | null;
  kitchen_tip: number | null;
  pos_sales: number | null;
  submitted_at?: string | null;
  second_waiter_name?: string | null;
  participates_in_pool?: boolean;
}

interface ExcelLayoutProps {
  warnings: ReactNode;
  expenses: ReactNode;
  advances: ReactNode;
  cashBalanceCard: ReactNode;
  waiterShifts: WaiterShiftData[];
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
    einladung: number;
    sonstige_einnahme: number;
    notes: string;
  };
  onFieldChange: (field: string, value: number | string) => void;
  // Calculated totals
  totalKassiertBrutto: number;
  kellnerUmsatz: number;
  totalCardTotal: number;
  totalDeliveryRevenue: number;
  totalOpenInvoices: number;
  totalExpenses: number;
  totalKitchenTip: number;
  waiterTipPool: number;
  waiterShareCount: number;
  tipPerWaiter: number;
  uniqueKitchenStaff: number;
  tipPerKitchen: number;
  bargeld: number;
  totalAdvances: number;
  locked?: boolean;
  getLabel?: (key: LabelKey) => string;
  isFieldHidden?: (key: LabelKey) => boolean;
}

export function ExcelLayout({
  warnings,
  expenses,
  advances,
  cashBalanceCard,
  waiterShifts,
  formData,
  onFieldChange,
  totalKassiertBrutto,
  kellnerUmsatz,
  totalCardTotal,
  totalDeliveryRevenue,
  totalOpenInvoices,
  totalExpenses,
  totalKitchenTip,
  waiterTipPool,
  waiterShareCount,
  tipPerWaiter,
  uniqueKitchenStaff,
  tipPerKitchen,
  bargeld,
  totalAdvances,
  locked,
  getLabel: gl,
  isFieldHidden: ifh,
}: ExcelLayoutProps) {
  const getLabel = gl || ((key: LabelKey) => key);
  const isFieldHidden = ifh || (() => false);
  const fmt = (value: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

  const terminalTotal = formData.terminal_1_total + formData.terminal_2_total;

  // Calculate expected cash per waiter
  const calcExpected = (w: WaiterShiftData) =>
    (w.kassiert_brutto || 0) + (w.hilf_mahl || 0) - (w.open_invoices || 0) - (w.card_total || 0);

  return (
    <div className="space-y-4">
      {warnings}

      {/* Main Excel-style two-column layout */}
      <div className="grid lg:grid-cols-[minmax(320px,2fr)_minmax(400px,3fr)] gap-4">
        {/* LEFT COLUMN - Hauptdaten */}
        <div className="space-y-0">
          <div className="border rounded-lg overflow-hidden shadow-sm">
            {/* Section: Umsatz */}
            <div className="bg-muted/50 px-3 py-2 border-b border-l-4 border-l-primary">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Umsatz</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <ExcelInputRow label={getLabel('pos_total')} value={formData.pos_total} onChange={(v) => onFieldChange('pos_total', v)} disabled={locked} />
              </tbody>
            </table>

            {/* Section: Kredit Karten */}
            <div className="bg-muted/50 px-3 py-2 border-y border-l-4 border-l-amber-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kredit Karten</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <ExcelInputRow label={getLabel('terminal_1')} value={formData.terminal_1_total} onChange={(v) => onFieldChange('terminal_1_total', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('terminal_2')} value={formData.terminal_2_total} onChange={(v) => onFieldChange('terminal_2_total', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('card_total_gl')} value={formData.card_total_gl} onChange={(v) => onFieldChange('card_total_gl', v)} disabled={locked} />
                
              </tbody>
            </table>

            {/* Section: Take Away */}
            <div className="bg-muted/50 px-3 py-2 border-y border-l-4 border-l-emerald-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Take Away</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <ExcelInputRow label={getLabel('takeaway_total')} value={formData.takeaway_total} onChange={(v) => onFieldChange('takeaway_total', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('ordersmart_revenue')} value={formData.ordersmart_revenue} onChange={(v) => onFieldChange('ordersmart_revenue', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('wolt_revenue')} value={formData.wolt_revenue} onChange={(v) => onFieldChange('wolt_revenue', v)} disabled={locked} />
                
              </tbody>
            </table>

            {/* Section: Gutscheine */}
            <div className="bg-muted/50 px-3 py-2 border-y border-l-4 border-l-violet-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gutscheine & Sonstiges</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <ExcelInputRow label={getLabel('vouchers_sold')} value={formData.vouchers_sold} onChange={(v) => onFieldChange('vouchers_sold', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('vouchers_redeemed')} value={formData.vouchers_redeemed} onChange={(v) => onFieldChange('vouchers_redeemed', v)} disabled={locked} />
                {!isFieldHidden('finedine_vouchers') && <ExcelInputRow label={getLabel('finedine_vouchers')} value={formData.finedine_vouchers} onChange={(v) => onFieldChange('finedine_vouchers', v)} disabled={locked} />}
                {totalOpenInvoices !== 0 && <ExcelReadonlyRow label="Offene Rechnungen" value={totalOpenInvoices} />}
                {totalAdvances !== 0 && <ExcelReadonlyRow label="Vorschuss" value={totalAdvances} />}
                <ExcelInputRow label={getLabel('einladung')} value={formData.einladung} onChange={(v) => onFieldChange('einladung', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('sonstige_einnahme')} value={formData.sonstige_einnahme} onChange={(v) => onFieldChange('sonstige_einnahme', v)} disabled={locked} />
                {totalExpenses !== 0 && <ExcelReadonlyRow label="Ausgaben" value={-totalExpenses} />}
              </tbody>
            </table>

            {/* BARGELD - highlighted */}
            <div className="bg-gradient-to-r from-primary/15 to-primary/5 border-y-2 border-primary/40 shadow-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="px-3 py-2.5 font-bold text-base">BARGELD</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-base ${bargeld >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {fmt(bargeld)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {cashBalanceCard}
        </div>

        {/* RIGHT COLUMN - Notizen + Ausgaben */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notizen</span>
            </div>
            <div className="p-3">
              <Textarea
                placeholder="Notizen für diesen Tag..."
                value={formData.notes}
                onChange={(e) => onFieldChange('notes', e.target.value)}
                rows={3}
                className="border-0 bg-transparent p-0 focus-visible:ring-0 resize-none"
                disabled={locked}
              />
            </div>
          </div>

          {/* Expenses */}
          {expenses}

          {/* Advances */}
          {advances}
        </div>
      </div>
    </div>
  );
}

// Helper components for compact Excel-style rows

function ExcelInputRow({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-1.5 font-medium text-foreground">{label}</td>
      <td className="px-3 py-1.5 w-36">
        <CurrencyInput value={value} onChange={onChange} className="h-7 text-sm border-primary/20 bg-primary/5" disabled={disabled} />
      </td>
    </tr>
  );
}

function ExcelReadonlyRow({
  label,
  value,
  bold,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: 'warning' | 'error';
  muted?: boolean;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  return (
    <tr className={`border-b last:border-b-0 ${highlight === 'warning' ? 'bg-warning/10' : bold ? 'bg-muted/20' : ''}`}>
      <td className={`px-3 py-1.5 ${bold ? 'font-semibold' : 'font-medium'} ${muted ? 'text-muted-foreground pl-6' : 'text-foreground'}`}>
        {label}
      </td>
      <td className={`px-3 py-1.5 text-right tabular-nums w-36 ${bold ? 'font-semibold' : ''} ${highlight ? 'text-warning font-medium' : ''}`}>
        {fmt(value)} €
      </td>
    </tr>
  );
}

function WaiterRow({
  label,
  shifts,
  getValue,
  fmt,
  bold,
  className,
  colorize,
  renderCell,
}: {
  label: string;
  shifts: WaiterShiftData[];
  getValue: (w: WaiterShiftData) => number;
  fmt: (v: number) => string;
  bold?: boolean;
  className?: string;
  colorize?: boolean;
  renderCell?: (w: WaiterShiftData) => ReactNode;
}) {
  return (
    <tr className={`border-b last:border-b-0 ${className || ''}`}>
      <td className={`px-3 py-1.5 ${bold ? 'font-semibold' : 'font-medium'} text-muted-foreground`}>
        {label}
      </td>
      {shifts.map((w) => {
        const val = getValue(w);
        return (
          <td
            key={w.id}
            className={`px-3 py-1.5 text-right tabular-nums ${bold ? 'font-semibold' : ''} ${colorize ? (val >= 0 ? 'text-success' : 'text-destructive') : ''}`}
          >
            {renderCell ? renderCell(w) : `${fmt(val)}`}
          </td>
        );
      })}
    </tr>
  );
}
