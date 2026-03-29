import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday } from 'date-fns';
import { getAllTeamMembers, countPoolShares } from '@/lib/waiterTeamUtils';
import { de } from 'date-fns/locale';
import { useSelectedDate } from '@/contexts/DateContext';
import { Plus, FileText, Euro, CreditCard, Truck, Receipt, Download, Trash2, Settings, Wallet, ClipboardList, Clock, CheckCircle2, AlertTriangle, FileDown, X } from 'lucide-react';
import { generateDailySummaryPDF } from '@/utils/pdfExport';
import { isSessionLocked } from '@/utils/businessDate';
import { SessionLockedBanner } from '@/components/shared/SessionLockedBanner';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { StatCard } from '@/components/shared/StatCard';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/contexts/AuthContext';
import { ExcelLayout } from '@/components/daily-summary/layouts/ExcelLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PdfPreview } from '@/components/shared/PdfPreview';
import {
  useSession,
  useCreateSession,
  useUpdateSession,
  useWaiterShifts,
  useKitchenShifts,
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
} from '@/hooks/useSession';
import { useAdvances, useCreateAdvance, useDeleteAdvance } from '@/hooks/useAdvances';
import { StaffSelect } from '@/components/shared/StaffSelect';
import { useLabels } from '@/hooks/useLabels';
import { LabelSettings } from '@/components/settings/LabelSettings';
import { OrdersmartTakeawaySetting } from '@/components/settings/OrdersmartTakeawaySetting';
import { usePreviousDayDeficit } from '@/hooks/usePreviousDayDeficit';
import { useRemainingCash } from '@/hooks/useRemainingCash';
import { useTelegramSettings } from '@/hooks/useTelegramSettings';

export default function DailySummary() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId, restaurantName, restaurant } = useRestaurant();
  const { settings } = useTelegramSettings();
  const { user } = useAuth();
  

  const handleToggleLock = async (unlock: boolean) => {
    if (!session?.id || !restaurantId) return;
    try {
      await supabase.from('sessions').update({
        is_unlocked: unlock,
        unlocked_at: unlock ? new Date().toISOString() : null,
        unlocked_by_name: unlock ? (user?.name || null) : null,
      } as any).eq('id', session.id);
      // Audit log
      await supabase.from('audit_logs').insert({
        table_name: 'sessions',
        record_id: session.id,
        action: unlock ? 'unlock' : 'lock',
        changed_by_name: user?.name || 'Unbekannt',
        restaurant_id: restaurantId,
        old_values: { is_unlocked: !unlock },
        new_values: { is_unlocked: unlock, unlocked_by_name: unlock ? user?.name : null },
      });
      toast({ title: unlock ? 'Abrechnung entsperrt' : 'Abrechnung gesperrt' });
      // Refetch session
      window.location.reload();
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };
  

  // Form state for editable fields
  const [formData, setFormData] = useState({
    spicery_counter: 0,
    pos_total: 0,
    terminal_1_total: 0,
    terminal_2_total: 0,
    ordersmart_revenue: 0,
    wolt_revenue: 0,
    vouchers_sold: 0,
    vouchers_redeemed: 0,
    finedine_vouchers: 0,
    vorschuss: 0,
    einladung: 0,
    sonstige_einnahme: 0,
    notes: '',
    takeaway_total: 0,
    spicery_transactions: 0,
    card_total_gl: 0,
    guest_count: 0,
  });

  // Expense form
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);

  // Advance form
  const [advanceStaffName, setAdvanceStaffName] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate, restaurantId);
  const locked = isSessionLocked(selectedDate, !!(session as any)?.is_unlocked);
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const { data: kitchenShifts = [] } = useKitchenShifts(session?.id);
  const { data: expenses = [] } = useExpenses(session?.id);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: advances = [] } = useAdvances(session?.id);
  const createAdvance = useCreateAdvance();
  const deleteAdvance = useDeleteAdvance();
  
  // Previous day deficit
  const { data: previousDeficit = 0 } = usePreviousDayDeficit(selectedDate, restaurantId);

  // Remaining cash (Kassenbestand) with skimming
  const { remainingCash, todaySkimAmount } = useRemainingCash(restaurantId, selectedDate);

  // Labels
  const { getLabel, allLabels, isFieldHidden, hiddenFields } = useLabels(restaurantId);

  // Sync form data with session
  useEffect(() => {
    if (session) {
      setFormData({
        spicery_counter: session.spicery_counter || 0,
        pos_total: session.pos_total || 0,
        terminal_1_total: session.terminal_1_total || 0,
        terminal_2_total: session.terminal_2_total || 0,
        ordersmart_revenue: session.ordersmart_revenue || 0,
        wolt_revenue: session.wolt_revenue || 0,
        vouchers_sold: session.vouchers_sold || 0,
        vouchers_redeemed: session.vouchers_redeemed || 0,
        finedine_vouchers: session.finedine_vouchers || 0,
        vorschuss: session.vorschuss || 0,
        einladung: session.einladung || 0,
        sonstige_einnahme: session.sonstige_einnahme || 0,
        notes: session.notes || '',
        takeaway_total: session.takeaway_total || 0,
        spicery_transactions: session.spicery_transactions || 0,
        card_total_gl: session.card_total_gl || 0,
        guest_count: (session as any).guest_count || 0,
      });
    } else {
      setFormData({
        spicery_counter: 0,
        pos_total: 0,
        terminal_1_total: 0,
        terminal_2_total: 0,
        ordersmart_revenue: 0,
        wolt_revenue: 0,
        vouchers_sold: 0,
        vouchers_redeemed: 0,
        finedine_vouchers: 0,
        vorschuss: 0,
        einladung: 0,
        sonstige_einnahme: 0,
        notes: '',
        takeaway_total: 0,
        spicery_transactions: 0,
        card_total_gl: 0,
        guest_count: 0,
      });
    }
  }, [session]);

  const updateField = async (field: keyof typeof formData, value: number | string) => {
    // Use functional update to get the latest state and avoid race conditions
    let updatedFormData: typeof formData | null = null;
    
    setFormData((prev) => {
      updatedFormData = { ...prev, [field]: value };
      return updatedFormData;
    });
    
    // Auto-save to database with the correctly updated data
    if (session?.id && updatedFormData) {
      try {
        await updateSession.mutateAsync({
          id: session.id,
          ...updatedFormData,
          updated_by_name: user?.name || undefined,
        } as any);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  };

  const handleAddExpense = async () => {
    if (!session?.id || !expenseDescription.trim() || expenseAmount <= 0) return;

    try {
      await createExpense.mutateAsync({
        session_id: session.id,
        description: expenseDescription.trim(),
        amount: expenseAmount,
      });
      setExpenseDescription('');
      setExpenseAmount(0);
      toast({ title: 'Ausgabe hinzugefügt' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!session?.id) return;
    try {
      await deleteExpense.mutateAsync({ id, sessionId: session.id });
      toast({ title: 'Ausgabe gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  // Advance handlers
  const handleAddAdvance = async () => {
    if (!session?.id || !advanceStaffName || advanceAmount <= 0) return;
    try {
      await createAdvance.mutateAsync({
        session_id: session.id,
        staff_name: advanceStaffName,
        amount: advanceAmount,
      });
      setAdvanceStaffName('');
      setAdvanceAmount(0);
      toast({ title: 'Vorschuss hinzugefügt' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const handleDeleteAdvance = async (id: string) => {
    if (!session?.id) return;
    try {
      await deleteAdvance.mutateAsync({ id, sessionId: session.id });
      toast({ title: 'Vorschuss gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  // Calculate totals
  const kellnerUmsatz = waiterShifts.reduce((sum, w) => sum + (w.pos_sales || 0), 0);
  const totalCardTotal = waiterShifts.reduce((sum, w) => sum + (w.card_total || 0), 0) 
    + formData.card_total_gl;
  const totalHilfMahl = waiterShifts.reduce((sum, w) => sum + (w.hilf_mahl || 0), 0);
  const totalOpenInvoices = waiterShifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
  const totalKitchenTip = waiterShifts.reduce((sum, w) => sum + (w.kitchen_tip || 0), 0);
  const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0)
    + formData.ordersmart_revenue
    + formData.wolt_revenue
    + formData.takeaway_total;
  
  // Waiter tip pool calculation (uses pos_sales to match DB generated column)
  const calculateExpected = (w: typeof waiterShifts[0]) => 
    (w.pos_sales || 0) + (w.hilf_mahl || 0) - (w.open_invoices || 0) - (w.card_total || 0);
  const waiterTipPool = waiterShifts.reduce((sum, w) => 
    sum + ((w.cash_handed_in || 0) - calculateExpected(w) - (w.kitchen_tip || 0)), 0);
  
  // Count shares correctly: team shifts count as 2, non-participating shifts don't count
  const waiterShareCount = countPoolShares(waiterShifts.map(w => ({
    waiter_name: w.waiter_name,
    second_waiter_name: w.second_waiter_name,
    additional_waiters: (w as any).additional_waiters || [],
    participates_in_pool: w.participates_in_pool,
  })));
  const tipPerWaiter = waiterShareCount > 0 ? waiterTipPool / waiterShareCount : 0;
  
  // Keep totalWaiterTip for backward compatibility in calculations
  const totalWaiterTip = waiterTipPool;
  
  // Kitchen tip per person (average)
  const uniqueKitchenStaff = new Set(kitchenShifts.map(k => k.staff_name)).size;
  const tipPerKitchen = uniqueKitchenStaff > 0 ? totalKitchenTip / uniqueKitchenStaff : 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

  // Delivery revenue
  const totalDeliveryRevenue = 
    formData.ordersmart_revenue +
    formData.wolt_revenue +
    formData.takeaway_total;

  // Mismatch calculations for warnings
  const posMismatch = formData.pos_total - kellnerUmsatz;
  const terminalTotal = formData.terminal_1_total + formData.terminal_2_total;
  const waiterCardTotal = waiterShifts.reduce((sum, w) => sum + (w.card_total || 0), 0);
  const cardTerminalMismatch = terminalTotal - totalCardTotal;

  // BARGELD calculation - uses pos_total (Vectron total) as base
  const bargeld = 
    formData.pos_total +
    formData.vouchers_sold +
    formData.sonstige_einnahme -
    formData.terminal_1_total -
    formData.terminal_2_total -
    formData.ordersmart_revenue -
    formData.wolt_revenue -
    formData.vouchers_redeemed -
    formData.finedine_vouchers -
    formData.einladung -
    totalOpenInvoices -
    totalAdvances -
    totalExpenses +
    previousDeficit;

  // Raw daily cash (without previous deficit carry-over)
  const bargeldRaw = bargeld - previousDeficit;

  // Format submission timestamp
  const formatSubmittedAt = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const timeStr = format(date, 'HH:mm', { locale: de });
    
    if (isToday(date)) {
      return `Heute, ${timeStr} Uhr`;
    } else if (isYesterday(date)) {
      return `Gestern, ${timeStr} Uhr`;
    } else {
      return `${format(date, 'dd.MM.yyyy', { locale: de })}, ${timeStr} Uhr`;
    }
  };


  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId, createdByName: user?.name || undefined });
      toast({ title: 'Session erstellt', description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' });
    }
  };

  // PDF preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blobUrl: string; fileName: string } | null>(null);

  const handleExportPDF = () => {
    if (!session) return;
    
    const result = generateDailySummaryPDF({
      session: {
        ...session,
        pos_total: formData.pos_total,
        terminal_1_total: formData.terminal_1_total,
        terminal_2_total: formData.terminal_2_total,
        vouchers_sold: formData.vouchers_sold,
        vouchers_redeemed: formData.vouchers_redeemed,
        finedine_vouchers: formData.finedine_vouchers,
        vorschuss: formData.vorschuss,
        einladung: formData.einladung,
        sonstige_einnahme: formData.sonstige_einnahme,
        ordersmart_revenue: formData.ordersmart_revenue,
        wolt_revenue: formData.wolt_revenue,
        takeaway_total: formData.takeaway_total,
        card_total_gl: formData.card_total_gl,
        guest_count: formData.guest_count,
      },
      waiterShifts: waiterShifts.map(w => ({
        waiter_name: w.waiter_name,
        pos_sales: w.pos_sales || 0,
        kassiert_brutto: w.kassiert_brutto || 0,
        card_total: w.card_total || 0,
        hilf_mahl: w.hilf_mahl || 0,
        open_invoices: w.open_invoices || 0,
        cash_handed_in: w.cash_handed_in || 0,
        differenz: w.differenz || 0,
        kitchen_tip: w.kitchen_tip || 0,
        submitted_at: (w as any).submitted_at ?? null,
        updated_at: (w as any).updated_at ?? null,
        participates_in_pool: w.participates_in_pool ?? true,
        second_waiter_name: w.second_waiter_name ?? null,
        additional_waiters: (w as any).additional_waiters || [],
      })),
      kitchenShifts: kitchenShifts.map(k => ({
        staff_name: k.staff_name,
        hours_worked: k.hours_worked || 0,
      })),
      expenses: expenses.map(e => ({
        description: e.description,
        amount: e.amount,
      })),
      advances: advances.map(a => ({
        staff_name: a.staff_name,
        amount: a.amount,
      })),
      restaurantName,
      exportedBy: user?.name,
      createdByName: session?.created_by_name || undefined,
      updatedByName: session?.updated_by_name || undefined,
      labels: allLabels,
      hiddenFields,
      ordersmartInTakeaway: restaurant?.ordersmart_in_takeaway ?? true,
      totals: {
        kellnerUmsatz,
        totalCardTotal,
        totalHilfMahl,
        totalOpenInvoices,
        totalKitchenTip,
        totalWaiterTip,
        totalExpenses,
        totalDeliveryRevenue,
        bargeld,
        posMismatch,
        cardTerminalMismatch,
        totalAdvances,
        previousDeficit,
        bargeldRaw,
        remainingCash,
      },
    });
    
    setPdfPreview(result);
    setPdfPreviewOpen(true);
  };

  const handleDownloadPdf = useCallback(() => {
    if (pdfPreview) {
      const link = document.createElement('a');
      link.href = pdfPreview.blobUrl;
      link.download = pdfPreview.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Send Telegram notification if enabled (fire-and-forget)
      if (settings?.show_pdf_export_notification !== false) {
        supabase.functions.invoke('notify-pdf-export', {
          body: {
            date: format(selectedDate, 'yyyy-MM-dd'),
            restaurant_name: restaurantName,
            exported_by: user?.name,
          },
        }).catch((err) => console.error('Telegram notify failed:', err));
      }
    }
  }, [pdfPreview, selectedDate, restaurantName, user?.name, settings?.show_pdf_export_notification]);

  const handleClosePdfPreview = useCallback(() => {
    if (pdfPreview?.blobUrl) {
      URL.revokeObjectURL(pdfPreview.blobUrl);
    }
    setPdfPreview(null);
    setPdfPreviewOpen(false);
  }, [pdfPreview]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (sessionLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Laden...</div>
        </div>
      </AppLayout>
    );
  }

  // Render components for layout slots
  const ordersmartInTakeaway = restaurant?.ordersmart_in_takeaway ?? true;
  const adjustedPosDiff = posMismatch - formData.takeaway_total - (ordersmartInTakeaway ? 0 : formData.ordersmart_revenue);
  const warningsComponent = waiterShifts.length > 0 && (Math.abs(adjustedPosDiff) >= 0.01 || Math.abs(cardTerminalMismatch) >= 0.01) && (
    <div className="grid sm:grid-cols-2 gap-4">
      {Math.abs(adjustedPosDiff) >= 0.01 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">POS Differenz</p>
              <p className="text-sm text-muted-foreground">
                POS Total ({formatCurrency(formData.pos_total)}) stimmt nicht mit Mitarbeiter-Umsätzen ({formatCurrency(kellnerUmsatz)}) + Takeaway ({formatCurrency(formData.takeaway_total)}) überein.
              </p>
              <p className="text-sm font-semibold text-destructive mt-1">
                Differenz: {formatCurrency(adjustedPosDiff)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {Math.abs(cardTerminalMismatch) >= 0.01 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Terminal Differenz</p>
              <p className="text-sm text-muted-foreground">
                Terminals ({formatCurrency(terminalTotal)}) stimmen nicht mit Kartenzahlungen ({formatCurrency(waiterCardTotal)} Mitarbeiter + {formatCurrency(formData.card_total_gl)} GL = {formatCurrency(totalCardTotal)}) überein.
              </p>
              <p className="text-sm font-semibold text-destructive mt-1">
                Differenz: {formatCurrency(cardTerminalMismatch)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const statCardsComponent = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="BARGELD"
        value={bargeld}
        icon={<Euro className="w-5 h-5" />}
        variant={bargeld >= 0 ? 'success' : 'error'}
      />
      <StatCard
        label="Wechselgeldbestand"
        value={remainingCash}
        icon={<Wallet className="w-5 h-5" />}
        variant={remainingCash >= 0 ? 'success' : 'error'}
      />
      <StatCard
        label="Tagesumsatz"
        value={formData.pos_total}
        icon={<FileText className="w-5 h-5" />}
      />
      <StatCard
        label="Kartenzahlungen"
        value={totalCardTotal}
        icon={<CreditCard className="w-5 h-5" />}
      />
      <StatCard
        label="Take Away"
        value={totalDeliveryRevenue}
        icon={<Truck className="w-5 h-5" />}
      />
    </div>
  );

  const notesComponent = (
    <Card>
      <CardHeader>
        <CardTitle>Notizen</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Notizen für diesen Tag..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={4}
          disabled={locked}
        />
      </CardContent>
    </Card>
  );

  const posTerminalComponent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          POS & Terminal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Mitarbeiter Abzugebender Betrag</Label>
          <div className="h-10 px-3 flex items-center justify-end rounded-md border bg-muted text-right tabular-nums font-medium">
            {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalKassiertBrutto)} €
          </div>
        </div>
        <div>
          <Label>Vectron Gesamtumsatz</Label>
          <CurrencyInput
            value={formData.pos_total}
            onChange={(v) => updateField('pos_total', v)}
            disabled={locked}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Terminal 1</Label>
            <CurrencyInput
              value={formData.terminal_1_total}
              onChange={(v) => updateField('terminal_1_total', v)}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Terminal 2</Label>
            <CurrencyInput
              value={formData.terminal_2_total}
              onChange={(v) => updateField('terminal_2_total', v)}
              disabled={locked}
            />
          </div>
        </div>
        <div>
          <Label>Kreditkartenumsatz GL</Label>
          <CurrencyInput
            value={formData.card_total_gl}
            onChange={(v) => updateField('card_total_gl', v)}
            disabled={locked}
          />
        </div>
      </CardContent>
    </Card>
  );

  const takeawayComponent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Take Away
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Takeaway GL</Label>
          <CurrencyInput
            value={formData.takeaway_total}
            onChange={(v) => updateField('takeaway_total', v)}
            disabled={locked}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>OrderSmart</Label>
            <CurrencyInput
              value={formData.ordersmart_revenue}
              onChange={(v) => updateField('ordersmart_revenue', v)}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Wolt</Label>
            <CurrencyInput
              value={formData.wolt_revenue}
              onChange={(v) => updateField('wolt_revenue', v)}
              disabled={locked}
            />
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <Label>Take-Away Gesamt</Label>
            <span className="font-semibold tabular-nums">
              {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDeliveryRevenue)} €
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const vouchersComponent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Gutscheine & Abzüge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Gutschein Verkauf</Label>
          <CurrencyInput
            value={formData.vouchers_sold}
            onChange={(v) => updateField('vouchers_sold', v)}
            disabled={locked}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Eingelöst</Label>
            <CurrencyInput
              value={formData.vouchers_redeemed}
              onChange={(v) => updateField('vouchers_redeemed', v)}
              disabled={locked}
            />
          </div>
          <div>
            <Label>FineDine</Label>
            <CurrencyInput
              value={formData.finedine_vouchers}
              onChange={(v) => updateField('finedine_vouchers', v)}
              disabled={locked}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const otherComponent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Sonstiges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Einladung</Label>
          <CurrencyInput
            value={formData.einladung}
            onChange={(v) => updateField('einladung', v)}
            disabled={locked}
          />
        </div>
        <div>
          <Label>Sonstige Einnahmen</Label>
          <CurrencyInput
            value={formData.sonstige_einnahme}
            onChange={(v) => updateField('sonstige_einnahme', v)}
            disabled={locked}
          />
        </div>
      </CardContent>
    </Card>
  );

  const expensesComponent = (
    <Card>
      <CardHeader>
        <CardTitle>Ausgaben</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!locked && (
        <div className="flex gap-2">
          <Input
            placeholder="Beschreibung"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            className="flex-1"
          />
          <CurrencyInput
            value={expenseAmount}
            onChange={setExpenseAmount}
            className="w-28"
          />
          <Button onClick={handleAddExpense} disabled={!expenseDescription.trim() || expenseAmount <= 0}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        )}

        {expenses.length > 0 && (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <span className="text-sm">{expense.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums text-sm">
                      {formatCurrency(expense.amount)}
                    </span>
                    {!locked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    )}
                  </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Summe:</span>
              <span className="font-semibold tabular-nums text-destructive">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const advancesComponent = (
    <Card>
      <CardHeader>
        <CardTitle>Vorschuss</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!locked && (
        <div className="flex gap-2">
          <div className="flex-1">
            <StaffSelect
              value={advanceStaffName}
              onValueChange={setAdvanceStaffName}
              role="all"
              placeholder="Mitarbeiter wählen"
              restaurantId={restaurantId}
            />
          </div>
          <CurrencyInput
            value={advanceAmount}
            onChange={setAdvanceAmount}
            className="w-28"
          />
          <Button onClick={handleAddAdvance} disabled={!advanceStaffName || advanceAmount <= 0}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        )}

        {advances.length > 0 && (
          <div className="space-y-2">
            {advances.map((advance) => (
              <div
                key={advance.id}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <span className="text-sm">{advance.staff_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums text-sm">
                      {formatCurrency(advance.amount)}
                    </span>
                    {!locked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteAdvance(advance.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    )}
                  </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Summe:</span>
              <span className="font-semibold tabular-nums text-destructive">
                {formatCurrency(totalAdvances)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );


  const revenueCardComponent = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5" />
          Einnahmen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="py-2">Tagesumsatz (Vectron)</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.pos_total)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Gutschein Verkauf</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.vouchers_sold)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Sonstige Einnahmen</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.sonstige_einnahme)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Hilf Mahl</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(totalHilfMahl)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold py-2">Summe</TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-success py-2">
                {formatCurrency(formData.pos_total + formData.vouchers_sold + totalHilfMahl)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const deductionsCardComponent = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5" />
          Abzüge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="py-2">Terminal 1 + 2</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.terminal_1_total + formData.terminal_2_total)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Gutscheine (eingelöst)</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.vouchers_redeemed)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">FineDine</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.finedine_vouchers)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Vorschuss</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(totalAdvances)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Einladung</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.einladung)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Offene Rechnungen</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(totalOpenInvoices)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Ausgaben</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(totalExpenses)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">Take Away (extern)</TableCell>
              <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.ordersmart_revenue + formData.wolt_revenue)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold py-2">Summe</TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-destructive py-2">
                {formatCurrency(
                  formData.terminal_1_total +
                  formData.terminal_2_total +
                  formData.vouchers_redeemed +
                  formData.finedine_vouchers +
                   totalAdvances +
                  formData.einladung +
                  totalOpenInvoices +
                  totalExpenses +
                  formData.ordersmart_revenue +
                  formData.wolt_revenue
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const tipsCardComponent = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Trinkgeld</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="py-2">Küche (2%)</TableCell>
              <TableCell className="text-right tabular-nums font-medium text-success py-2">{formatCurrency(totalKitchenTip)}</TableCell>
            </TableRow>
            {uniqueKitchenStaff > 0 && (
              <TableRow>
                <TableCell className="py-2 pl-6 text-muted-foreground">→ Pro Küche ({uniqueKitchenStaff})</TableCell>
                <TableCell className="text-right tabular-nums text-success py-2">{formatCurrency(tipPerKitchen)}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="py-2">Mitarbeiter Pool</TableCell>
              <TableCell className="text-right tabular-nums font-medium text-success py-2">{formatCurrency(waiterTipPool)}</TableCell>
            </TableRow>
            {waiterShareCount > 0 && (
              <TableRow>
                <TableCell className="py-2 pl-6 text-muted-foreground">→ Pro Mitarbeiter ({waiterShareCount})</TableCell>
                <TableCell className="text-right tabular-nums text-success py-2">{formatCurrency(tipPerWaiter)}</TableCell>
              </TableRow>
            )}
            <TableRow className="border-t-2">
              <TableCell className="font-semibold py-2">Gesamt</TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-success py-2">{formatCurrency(totalKitchenTip + totalWaiterTip)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const waiterStatusComponent = waiterShifts.length > 0 ? (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5" />
          Mitarbeiter-Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {waiterShifts.flatMap((shift) => {
            const submittedAt = formatSubmittedAt((shift as any).submitted_at);
            const hasData = (shift.pos_sales || 0) > 0 || (shift.cash_handed_in || 0) > 0;
            const allMembers = getAllTeamMembers({
              waiter_name: shift.waiter_name,
              second_waiter_name: shift.second_waiter_name,
              additional_waiters: (shift as any).additional_waiters || [],
            });
            const teamSize = allMembers.length;
            const posSales = (shift.pos_sales || 0) / teamSize;
            const poolShare = shift.participates_in_pool ? tipPerWaiter : 0;
            const tipPct = posSales > 0 && shift.participates_in_pool
              ? ((poolShare / posSales) * 100).toFixed(1).replace('.', ',') + '%'
              : null;

            const renderRow = (name: string, key: string) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="font-medium text-sm">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground hidden sm:inline">
                    {formatCurrency(posSales)}
                  </span>
                  {tipPct && (
                    <span className="text-xs tabular-nums text-success hidden sm:inline">
                      {formatCurrency(poolShare)} ({tipPct})
                    </span>
                  )}
                  {hasData ? (
                    <Badge variant="default" className="gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      Offen
                    </Badge>
                  )}
                  {submittedAt && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {submittedAt}
                    </span>
                  )}
                </div>
              </div>
            );

            return allMembers.map((name, idx) => renderRow(name, `${shift.id}-${idx}`));
          })}
        </div>
      </CardContent>
    </Card>
  ) : null;

  const renderExcelLayout = () => (
    <ExcelLayout
      warnings={warningsComponent}
      expenses={expensesComponent}
      advances={advancesComponent}
      
      waiterShifts={waiterShifts}
      formData={formData}
      onFieldChange={(field, value) => updateField(field as keyof typeof formData, value)}
      totalKassiertBrutto={totalKassiertBrutto}
      kellnerUmsatz={kellnerUmsatz}
      totalCardTotal={totalCardTotal}
      totalDeliveryRevenue={totalDeliveryRevenue}
      totalOpenInvoices={totalOpenInvoices}
      totalExpenses={totalExpenses}
      totalKitchenTip={totalKitchenTip}
      waiterTipPool={waiterTipPool}
      waiterShareCount={waiterShareCount}
      tipPerWaiter={tipPerWaiter}
      uniqueKitchenStaff={uniqueKitchenStaff}
      tipPerKitchen={tipPerKitchen}
      bargeld={bargeld}
      bargeldRaw={bargeldRaw}
      totalAdvances={totalAdvances}
      locked={locked}
      getLabel={getLabel}
      isFieldHidden={isFieldHidden}
      previousDeficit={previousDeficit}
      remainingCash={remainingCash}
      todaySkimAmount={todaySkimAmount}
      createdByName={session?.created_by_name || undefined}
      updatedByName={session?.updated_by_name || undefined}
      guestCount={formData.guest_count}
      onGuestCountChange={(v) => updateField('guest_count', v)}
      ordersmartInTakeaway={restaurant?.ordersmart_in_takeaway ?? false}
    />
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Tagesabrechnung
            </h1>
            <p className="text-xl lg:text-2xl font-semibold text-foreground mt-1">
              {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
            {session?.created_by_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Erstellt von: {session.created_by_name}
                {session.updated_by_name && session.updated_by_name !== session.created_by_name && (
                  <span> · Zuletzt bearbeitet von: {session.updated_by_name}</span>
                )}
              </p>
            )}
            {!session && user?.name && (
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DateSelector date={selectedDate} onDateChange={setSelectedDate} />
            {session && (
              <Button onClick={() => {
                if (formData.guest_count === 0) {
                  toast({ title: "Gästeanzahl fehlt", variant: "destructive" });
                  return;
                }
                handleExportPDF();
              }} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                PDF Export
              </Button>
            )}
          </div>
        </div>

        {/* No Session State */}
        {!session && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Noch keine Abrechnung für diesen Tag vorhanden.
              </p>
              <Button onClick={handleCreateSession} disabled={createSession.isPending || !restaurantId}>
                <Plus className="w-4 h-4 mr-2" />
                Neue Abrechnung
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Session Content */}
        {session && (
          <>
            {(locked || !!(session as any)?.is_unlocked) && (
              <SessionLockedBanner
                isUnlocked={!!(session as any)?.is_unlocked}
                permissionLevel={user?.permissionLevel || 'staff'}
                onUnlock={() => handleToggleLock(true)}
                onLock={() => handleToggleLock(false)}
              />
            )}
            {renderExcelLayout()}

            {/* Settings for admins only */}
            {user?.permissionLevel === 'admin' && (
              <>
                <OrdersmartTakeawaySetting />
                <LabelSettings />
              </>
            )}
          </>
        )}
      </div>


      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={(open) => !open && handleClosePdfPreview()}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              PDF Vorschau - {pdfPreview?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 min-h-0">
            {pdfPreview && <PdfPreview blobUrl={pdfPreview.blobUrl} fileName={pdfPreview.fileName} className="h-full" />}
          </div>
          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={handleClosePdfPreview}>
              <X className="w-4 h-4 mr-2" />
              Schließen
            </Button>
            <Button variant="default" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              PDF herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
