import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSelectedDate } from '@/contexts/DateContext';
import { Plus, FileText, Euro, CreditCard, Truck, Receipt, Download, Banknote, Vault, Trash2, Settings, Wallet, ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { generateDailySummaryPDF } from '@/utils/pdfExport';
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
import { useRegisterTransfers } from '@/hooks/useRegisterTransfers';
import { TransferDialog } from '@/components/register/TransferDialog';
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

export default function DailySummary() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId, restaurantName } = useRestaurant();
  const { user } = useAuth();
  const [showTransferDialog, setShowTransferDialog] = useState(false);

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
  });

  // Expense form
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate, restaurantId);
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const { data: kitchenShifts = [] } = useKitchenShifts(session?.id);
  const { data: expenses = [] } = useExpenses(session?.id);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  
  // Cash balance hooks
  const { transfers, balances, createTransfer, isCreating } = useRegisterTransfers(restaurantId);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

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
        });
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
  
  // Waiter tip pool calculation
  const calculateExpected = (w: typeof waiterShifts[0]) => 
    (w.kassiert_brutto || 0) + (w.hilf_mahl || 0) - (w.open_invoices || 0) - (w.card_total || 0);
  const waiterTipPool = waiterShifts.reduce((sum, w) => 
    sum + ((w.cash_handed_in || 0) - calculateExpected(w) - (w.kitchen_tip || 0)), 0);
  const waiterCount = waiterShifts.length;
  const tipPerWaiter = waiterCount > 0 ? waiterTipPool / waiterCount : 0;
  
  // Keep totalWaiterTip for backward compatibility in calculations
  const totalWaiterTip = waiterTipPool;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
    formData.vorschuss -
    totalExpenses;

  // Simplified daily cash balance calculation
  const initialRestaurantBalance = balances.initialRestaurant; // 1.000 €
  
  const todaysVaultTransfers = useMemo(() => {
    return transfers
      .filter(t => t.direction === 'to_restaurant' && t.transfer_date === selectedDateStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transfers, selectedDateStr]);

  const todaysRegisterBalance = initialRestaurantBalance + bargeld + todaysVaultTransfers;
  const showCashBalanceCard = todaysRegisterBalance < initialRestaurantBalance; // nur zeigen wenn < 1.000 €

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

  const handleTransferSubmit = (data: {
    transfer_date: string;
    amount: number;
    direction: 'to_restaurant' | 'to_safe';
    reason: string | null;
    restaurant_id: string;
  }) => {
    createTransfer(data);
    setShowTransferDialog(false);
    toast({ title: 'Transfer erfasst', description: 'Der Transfer wurde gespeichert.' });
  };

  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId });
      toast({ title: 'Session erstellt', description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' });
    }
  };

  const handleExportPDF = () => {
    if (!session) return;
    
    generateDailySummaryPDF({
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
      })),
      kitchenShifts: kitchenShifts.map(k => ({
        staff_name: k.staff_name,
        hours_worked: k.hours_worked || 0,
      })),
      expenses: expenses.map(e => ({
        description: e.description,
        amount: e.amount,
      })),
      restaurantName,
      exportedBy: user?.name,
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
      },
    });
    
    toast({
      title: 'PDF erstellt', 
      description: 'Die Tagesabrechnung wurde als PDF heruntergeladen.' 
    });
  };

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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Tagesabrechnung
            </h1>
            <p className="text-muted-foreground mt-1">
              Komplette Übersicht für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateSelector date={selectedDate} onDateChange={setSelectedDate} />
            {session && (
              <Button onClick={handleExportPDF} variant="outline" className="gap-2">
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
                Keine Session für diesen Tag vorhanden.
              </p>
              <Button onClick={handleCreateSession} disabled={createSession.isPending || !restaurantId}>
                <Plus className="w-4 h-4 mr-2" />
                Session erstellen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Session Content */}
        {session && (
          <div className="space-y-6">
            {/* Warning Cards - Show when there are mismatches */}
            {waiterShifts.length > 0 && (Math.abs(posMismatch - formData.takeaway_total) >= 0.01 || Math.abs(cardTerminalMismatch) >= 0.01) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {Math.abs(posMismatch - formData.takeaway_total) >= 0.01 && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="py-4 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                      <div>
                        <p className="font-medium text-destructive">POS Differenz</p>
                        <p className="text-sm text-muted-foreground">
                          POS Total ({formatCurrency(formData.pos_total)}) stimmt nicht mit Kellner-Umsätzen ({formatCurrency(kellnerUmsatz)}) + Takeaway ({formatCurrency(formData.takeaway_total)}) überein.
                        </p>
                        <p className="text-sm font-semibold text-destructive mt-1">
                          Differenz: {formatCurrency(posMismatch - formData.takeaway_total)}
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
                          Terminals ({formatCurrency(terminalTotal)}) stimmen nicht mit Kartenzahlungen ({formatCurrency(waiterCardTotal)} Kellner + {formatCurrency(formData.card_total_gl)} GL = {formatCurrency(totalCardTotal)}) überein.
                        </p>
                        <p className="text-sm font-semibold text-destructive mt-1">
                          Differenz: {formatCurrency(cardTerminalMismatch)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Main Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="BARGELD"
                value={bargeld}
                icon={<Euro className="w-5 h-5" />}
                variant={bargeld >= 0 ? 'success' : 'error'}
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

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN - Input */}
              <div className="space-y-6">
                {/* Notes */}
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
                    />
                  </CardContent>
                </Card>

                {/* POS & Terminal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      POS & Terminal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Kellner Abzugebender Betrag</Label>
                      <div className="h-10 px-3 flex items-center justify-end rounded-md border bg-muted text-right tabular-nums font-medium">
                        {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalKassiertBrutto)} €
                      </div>
                    </div>
                    <div>
                      <Label>Vectron Gesamtumsatz</Label>
                      <CurrencyInput
                        value={formData.pos_total}
                        onChange={(v) => updateField('pos_total', v)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Terminal 1</Label>
                        <CurrencyInput
                          value={formData.terminal_1_total}
                          onChange={(v) => updateField('terminal_1_total', v)}
                        />
                      </div>
                      <div>
                        <Label>Terminal 2</Label>
                        <CurrencyInput
                          value={formData.terminal_2_total}
                          onChange={(v) => updateField('terminal_2_total', v)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Kreditkartenumsatz GL</Label>
                      <CurrencyInput
                        value={formData.card_total_gl}
                        onChange={(v) => updateField('card_total_gl', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Take Away */}
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
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>OrderSmart</Label>
                        <CurrencyInput
                          value={formData.ordersmart_revenue}
                          onChange={(v) => updateField('ordersmart_revenue', v)}
                        />
                      </div>
                      <div>
                        <Label>Wolt</Label>
                        <CurrencyInput
                          value={formData.wolt_revenue}
                          onChange={(v) => updateField('wolt_revenue', v)}
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

                {/* Vouchers & Deductions */}
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
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Eingelöst</Label>
                        <CurrencyInput
                          value={formData.vouchers_redeemed}
                          onChange={(v) => updateField('vouchers_redeemed', v)}
                        />
                      </div>
                      <div>
                        <Label>FineDine</Label>
                        <CurrencyInput
                          value={formData.finedine_vouchers}
                          onChange={(v) => updateField('finedine_vouchers', v)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Other Income & Deductions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Sonstiges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Vorschuss</Label>
                        <CurrencyInput
                          value={formData.vorschuss}
                          onChange={(v) => updateField('vorschuss', v)}
                        />
                      </div>
                      <div>
                        <Label>Einladung</Label>
                        <CurrencyInput
                          value={formData.einladung}
                          onChange={(v) => updateField('einladung', v)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Sonstige Einnahmen</Label>
                      <CurrencyInput
                        value={formData.sonstige_einnahme}
                        onChange={(v) => updateField('sonstige_einnahme', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ausgaben</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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
              </div>

              {/* RIGHT COLUMN - Summary & Status */}
              <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
                {/* Kassenstand Card - nur anzeigen wenn Kassenstand < 1.000 € */}
                {showCashBalanceCard && (
                  <Card className="border-warning/30 bg-warning/5 dark:bg-warning/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Banknote className="w-5 h-5" />
                        Kassenstand
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Anfangsbestand</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(initialRestaurantBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Bargeld heute</span>
                        <span className={`font-semibold tabular-nums ${bargeld >= 0 ? 'text-success' : 'text-warning'}`}>
                          {formatCurrency(bargeld)}
                        </span>
                      </div>
                      {todaysVaultTransfers > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Transfer Tresor</span>
                          <span className="font-semibold tabular-nums text-primary">
                            +{formatCurrency(todaysVaultTransfers)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Kassenstand</span>
                        <span className={`text-lg font-bold tabular-nums ${todaysRegisterBalance >= initialRestaurantBalance ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(todaysRegisterBalance)}
                        </span>
                      </div>
                      {todaysRegisterBalance < initialRestaurantBalance && (
                        <Button onClick={() => setShowTransferDialog(true)} variant="outline" className="w-full gap-2">
                          <Vault className="w-4 h-4" />
                          Transfer vom Tresor
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Revenue Breakdown */}
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
                            {formatCurrency(formData.pos_total + formData.vouchers_sold + formData.sonstige_einnahme + totalHilfMahl)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Deductions Breakdown */}
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
                          <TableCell className="py-2">Vorschuss + Einladung</TableCell>
                          <TableCell className="text-right tabular-nums py-2">{formatCurrency(formData.vorschuss + formData.einladung)}</TableCell>
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
                              formData.vorschuss +
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

                {/* Tips Overview */}
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
                        <TableRow>
                          <TableCell className="py-2">Kellner Pool</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-success py-2">{formatCurrency(waiterTipPool)}</TableCell>
                        </TableRow>
                        {waiterCount > 0 && (
                          <TableRow>
                            <TableCell className="py-2 pl-6 text-muted-foreground">→ Pro Kellner ({waiterCount})</TableCell>
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

                {/* Waiter Submissions Overview */}
                {waiterShifts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ClipboardList className="w-5 h-5" />
                        Kellner-Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {waiterShifts.map((shift) => {
                          const submittedAt = formatSubmittedAt((shift as any).submitted_at);
                          const hasData = (shift.pos_sales || 0) > 0 || (shift.cash_handed_in || 0) > 0;
                          
                          return (
                            <div key={shift.id} className="flex items-center justify-between py-1">
                              <span className="font-medium text-sm">{shift.waiter_name}</span>
                              <div className="flex items-center gap-2">
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
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      {restaurantId && (
        <TransferDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          onSubmit={handleTransferSubmit}
          restaurantId={restaurantId}
          isPending={isCreating}
        />
      )}
    </AppLayout>
  );
}
