import { ReactNode, useState } from 'react';
import { Input } from '@/components/ui/input';
import { User, PenLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  additional_waiters?: string[];
  participates_in_pool?: boolean;
}

interface ExcelLayoutProps {
  warnings: ReactNode;
  expenses: ReactNode;
  advances: ReactNode;

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
  previousDeficit?: number;
  bargeldRaw?: number;
  remainingCash?: number;
  todaySkimAmount?: number;
  createdByName?: string;
  updatedByName?: string;
  guestCount?: number;
  onGuestCountChange?: (value: number) => void;
  ordersmartInTakeaway?: boolean;
}

export function ExcelLayout({
  warnings,
  expenses,
  advances,

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
  previousDeficit = 0,
  bargeldRaw,
  remainingCash,
  todaySkimAmount = 0,
  createdByName,
  updatedByName,
  guestCount = 0,
  onGuestCountChange,
  ordersmartInTakeaway = false
}: ExcelLayoutProps) {
  const getLabel = gl || ((key: LabelKey) => key);
  const isFieldHidden = ifh || (() => false);
  const [showAvgWarning, setShowAvgWarning] = useState(false);
  const [pendingGuestCount, setPendingGuestCount] = useState(0);
  const [pendingAverage, setPendingAverage] = useState(0);
  const [localGuestInput, setLocalGuestInput] = useState(guestCount > 0 ? String(guestCount) : '');

  const handleGuestCountChange = (newCount: number) => {
    if (newCount > 0) {
      const avg = (formData.pos_total - (formData.takeaway_total || 0)) / newCount;
      if (avg > 50) {
        setPendingGuestCount(newCount);
        setPendingAverage(avg);
        setShowAvgWarning(true);
        return;
      }
    }
    onGuestCountChange?.(newCount);
  };

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

      {/* Session creator/editor info */}
      {(createdByName || updatedByName) &&
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {createdByName &&
        <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Erstellt von: <span className="font-medium text-foreground">{createdByName}</span>
            </span>
        }
          {updatedByName && updatedByName !== createdByName &&
        <span className="inline-flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" />
              Bearbeitet von: <span className="font-medium text-foreground">{updatedByName}</span>
            </span>
        }
        </div>
      }

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
                <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-1.5 font-medium text-foreground">Gästeanzahl</td>
                  <td className="px-3 py-1.5 w-36">
                    <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={localGuestInput}
                        placeholder="0"
                        onChange={(e) => {
                          setLocalGuestInput(e.target.value.replace(/\D/g, ''));
                        }}
                        onBlur={() => {
                          const val = localGuestInput ? parseInt(localGuestInput, 10) : 0;
                          handleGuestCountChange(val);
                        }}
                        className="h-7 text-sm border-primary/20 bg-primary/5 w-20 text-right"
                        disabled={locked} />

                      {guestCount > 0 &&
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ⌀ {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((formData.pos_total - (formData.takeaway_total || 0)) / guestCount)} €
                        </span>
                      }
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section: Kredit Karten */}
            <div className="bg-muted/50 px-3 py-2 border-y border-l-4 border-l-amber-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kreditkarten</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <ExcelInputRow label={getLabel('terminal_1')} value={formData.terminal_1_total} onChange={(v) => onFieldChange('terminal_1_total', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('terminal_2')} value={formData.terminal_2_total} onChange={(v) => onFieldChange('terminal_2_total', v)} disabled={locked} />
                <ExcelInputRow label={getLabel('card_total_gl')} value={formData.card_total_gl} onChange={(v) => onFieldChange('card_total_gl', v)} disabled={locked} />
                
              </tbody>
            </table>

            {/* Section: Take Away */}
            <div className="bg-muted/50 px-3 py-2 border-y border-l-4 border-l-emerald-500 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Take Away</span>
              {formData.pos_total > 0 &&
              <span className="text-xs text-muted-foreground tabular-nums">
                  {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
                  (ordersmartInTakeaway ?
                  formData.takeaway_total :
                  formData.takeaway_total + formData.ordersmart_revenue) /
                  formData.pos_total * 100
                )} %
                </span>
              }
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
                {previousDeficit < 0 && <ExcelReadonlyRow label="Fehlbetrag Vortag" value={previousDeficit} />}
                {totalExpenses !== 0 && <ExcelReadonlyRow label="Ausgaben" value={-totalExpenses} />}
              </tbody>
            </table>

            {/* Tages-Bargeld (raw, without previous deficit) - only show when deficit exists */}
            {bargeldRaw !== undefined &&
            <div className="bg-muted/30 border-y">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-3 py-1.5 font-semibold text-sm">Tages-Bargeld</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold text-sm ${bargeldRaw >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmt(bargeldRaw)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }

            {/* BARGELD - highlighted */}
            <div className="bg-gradient-to-r from-primary/15 to-primary/5 border-y-2 border-primary/40 shadow-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="px-3 py-2.5 font-bold text-base">Differenz zum Wechselgeldbestand</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-base ${bargeld >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {fmt(bargeld)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Abschöpfung */}
            {todaySkimAmount > 0 &&
            <div className="bg-amber-500/10 border-b">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-sm text-amber-700 dark:text-amber-400">Bargeld mit der Abrechnung in den Tresor legen           </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-sm text-amber-700 dark:text-amber-400">
                        {fmt(todaySkimAmount)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }

            {/* Kassenbestand */}
            <div className={`border-b ${(remainingCash ?? 0) >= 2000 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-3 py-1.5 font-semibold text-sm">Wechselgeldbestand (soll ist 2000 €)</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold text-sm ${(remainingCash ?? 0) >= 2000 ? 'text-success' : 'text-destructive'}`}>
                        {fmt(remainingCash ?? 0)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

          </div>

          
        </div>

        {/* RIGHT COLUMN - Notizen + Ausgaben */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nachricht / BESONDERHEITEN / Probleme       </span>
            </div>
            <div className="p-3">
              <Textarea
                placeholder="wird an Chefin um 07:00 Uhr übertragen..."
                value={formData.notes}
                onChange={(e) => onFieldChange('notes', e.target.value)}
                rows={3}
                className="border-0 bg-transparent p-0 focus-visible:ring-0 resize-none"
                disabled={locked} />

            </div>
          </div>

          {/* Expenses */}
          {expenses}

          {/* Advances */}
          {advances}
        </div>
      </div>
      <AlertDialog open={showAvgWarning} onOpenChange={setShowAvgWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoher Durchschnittsverzehr</AlertDialogTitle>
            <AlertDialogDescription>
              Der Durchschnitt pro Gast beträgt{' '}
              <span className="font-semibold">{fmt(pendingAverage)} €</span>.
              Ist das korrekt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onGuestCountChange?.(pendingGuestCount);
              setShowAvgWarning(false);
            }}>Bestätigen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

// Helper components for compact Excel-style rows

function ExcelInputRow({ label, value, onChange, disabled }: {label: string;value: number;onChange: (v: number) => void;disabled?: boolean;}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-1.5 font-medium text-foreground">{label}</td>
      <td className="px-3 py-1.5 w-36">
        <CurrencyInput value={value} onChange={onChange} className="h-7 text-sm border-primary/20 bg-primary/5" disabled={disabled} />
      </td>
    </tr>);

}

function ExcelReadonlyRow({
  label,
  value,
  bold,
  highlight,
  muted






}: {label: string;value: number;bold?: boolean;highlight?: 'warning' | 'error';muted?: boolean;}) {
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
    </tr>);

}

function WaiterRow({
  label,
  shifts,
  getValue,
  fmt,
  bold,
  className,
  colorize,
  renderCell









}: {label: string;shifts: WaiterShiftData[];getValue: (w: WaiterShiftData) => number;fmt: (v: number) => string;bold?: boolean;className?: string;colorize?: boolean;renderCell?: (w: WaiterShiftData) => ReactNode;}) {
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
            className={`px-3 py-1.5 text-right tabular-nums ${bold ? 'font-semibold' : ''} ${colorize ? val >= 0 ? 'text-success' : 'text-destructive' : ''}`}>

            {renderCell ? renderCell(w) : `${fmt(val)}`}
          </td>);

      })}
    </tr>);

}