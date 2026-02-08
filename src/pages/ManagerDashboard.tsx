import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useSelectedDate } from '@/contexts/DateContext';
import { de } from 'date-fns/locale';
import { Plus, Trash2, Settings, Truck, Receipt, Wallet, ClipboardList, Clock, CheckCircle2, AlertTriangle, Banknote, Vault } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRegisterTransfers } from '@/hooks/useRegisterTransfers';
import { TransferDialog } from '@/components/register/TransferDialog';
import {
  useSession,
  useCreateSession,
  useUpdateSession,
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
  useWaiterShifts,
} from '@/hooks/useSession';

export default function ManagerDashboard() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { restaurantId } = useRestaurant();
  const { toast } = useToast();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  // Form state
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
  const { data: expenses = [] } = useExpenses(session?.id);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);

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

  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId });
      toast({ title: 'Session erstellt', description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!session?.id) return;

    try {
      await updateSession.mutateAsync({
        id: session.id,
        ...formData,
      });
      toast({ title: 'Gespeichert', description: 'Änderungen wurden gespeichert.' });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen.', variant: 'destructive' });
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate BARGELD preview using waiter data
  const kellnerUmsatz = waiterShifts.reduce((sum, w) => sum + (w.pos_sales || 0), 0);
  const totalHilfMahl = waiterShifts.reduce((sum, w) => sum + (w.hilf_mahl || 0), 0);
  const totalOpenInvoices = waiterShifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
  const totalCardTotal = waiterShifts.reduce((sum, w) => sum + (w.card_total || 0), 0) + formData.card_total_gl;
  const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0)
    + formData.ordersmart_revenue
    + formData.wolt_revenue
    + formData.takeaway_total;

  // Mismatch calculations for warnings
  const posMismatch = formData.pos_total - kellnerUmsatz;
  const terminalTotal = formData.terminal_1_total + formData.terminal_2_total;
  const cardTerminalMismatch = terminalTotal - totalCardTotal;
  const waiterCardTotal = waiterShifts.reduce((sum, w) => sum + (w.card_total || 0), 0);

  // Delivery revenue
  const totalDeliveryRevenue = 
    formData.ordersmart_revenue +
    formData.wolt_revenue +
    formData.takeaway_total;

  // BARGELD calculation - uses pos_total (Vectron total) as base
  const bargeldPreview = 
    formData.pos_total +
    formData.vouchers_sold -
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

  // Cash balance hooks
  const { transfers, balances, createTransfer, isCreating } = useRegisterTransfers(restaurantId);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Today's date string for filtering transfers
  const todayStr = format(selectedDate, 'yyyy-MM-dd');

  // Today's vault transfers (cash brought from safe to restaurant register)
  const todayVaultTransfers = useMemo(() => {
    return transfers
      .filter(t => t.direction === 'to_restaurant' && t.transfer_date === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transfers, todayStr]);

  // Register balance calculation:
  // Each day starts fresh with the initial float (1.000 €)
  // Any excess cash from the previous day is deposited/removed
  // So we only add today's cash result + any vault transfers made today
  const projectedRegisterBalance = balances.initialRestaurant + bargeldPreview + todayVaultTransfers;

  // Show card only when projected balance falls below initial (1.000 €)
  const showCashBalanceCard = projectedRegisterBalance < balances.initialRestaurant;

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
              Manager Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Tägliche Session-Daten und Einstellungen
            </p>
          </div>
          <DateSelector date={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* Warning Cards - Show when there are mismatches */}
        {session && waiterShifts.length > 0 && (Math.abs(posMismatch - formData.takeaway_total) >= 0.01 || Math.abs(cardTerminalMismatch) >= 0.01) && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* No Session State */}
        {!session && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Keine Session für diesen Tag vorhanden.
              </p>
              <Button onClick={handleCreateSession} disabled={createSession.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Session erstellen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Session Content */}
        {session && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Notes - Now at the top */}
               <Card>
                 <CardHeader>
                   <CardTitle>Notizen</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <Textarea
                     placeholder="Notizen für diesen Tag..."
                     value={formData.notes}
                     onChange={(e) => updateField('notes', e.target.value)}
                     rows={6}
                   />
                 </CardContent>
               </Card>

               {/* Kassenstand Card - only when projected balance is below initial */}
               {showCashBalanceCard && (
                 <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 lg:col-start-3 md:col-span-2 lg:col-span-1">
                   <CardHeader className="pb-2">
                     <CardTitle className="flex items-center gap-2 text-lg">
                       <Banknote className="w-5 h-5" />
                       Kassenstand
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     {/* Starting float (Wechselgeld) */}
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground">Wechselgeld (Anfang)</span>
                       <span className="font-semibold tabular-nums">
                         {formatCurrency(balances.initialRestaurant)}
                       </span>
                     </div>

                     {/* Today's vault transfers if any */}
                     {todayVaultTransfers > 0 && (
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-muted-foreground">+ Tresor-Transfer heute</span>
                         <span className="font-semibold tabular-nums text-emerald-600">
                           +{formatCurrency(todayVaultTransfers)}
                         </span>
                       </div>
                     )}

                     {/* Today's cash preview */}
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground">Bargeld heute (Vorschau)</span>
                       <span className={`font-semibold tabular-nums ${bargeldPreview >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {formatCurrency(bargeldPreview)}
                       </span>
                     </div>
                     
                     <Separator />

                     {/* Projected register balance after today */}
                     <div className="flex justify-between items-center">
                       <span className="text-sm font-medium">Kassenstand nach heute</span>
                       <span className={`text-lg font-bold tabular-nums ${projectedRegisterBalance >= balances.initialRestaurant ? 'text-emerald-600' : 'text-destructive'}`}>
                         {formatCurrency(projectedRegisterBalance)}
                       </span>
                     </div>

                     {/* Transfer button when balance is below initial */}
                     {projectedRegisterBalance < balances.initialRestaurant && (
                       <Button onClick={() => setShowTransferDialog(true)} variant="outline" className="w-full gap-2">
                         <Vault className="w-4 h-4" />
                         Transfer vom Tresor
                       </Button>
                     )}
                   </CardContent>
                 </Card>
               )}

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
                  <div>
                    <Label>Kredit Karten Terminal 1</Label>
                    <CurrencyInput
                      value={formData.terminal_1_total}
                      onChange={(v) => updateField('terminal_1_total', v)}
                    />
                  </div>
                  <div>
                    <Label>Kredit Karten Terminal 2</Label>
                    <CurrencyInput
                      value={formData.terminal_2_total}
                      onChange={(v) => updateField('terminal_2_total', v)}
                    />
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

              {/* Delivery Platforms */}
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
                  <div className="pt-2 border-t">
                    <Label>Take-Away Gesamt</Label>
                    <div className="h-10 px-3 flex items-center justify-end rounded-md border bg-muted text-right tabular-nums font-medium">
                      {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                        formData.takeaway_total + formData.ordersmart_revenue + formData.wolt_revenue
                      )} €
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
                    <Label>Gutschein Verkauf (verkauft)</Label>
                    <CurrencyInput
                      value={formData.vouchers_sold}
                      onChange={(v) => updateField('vouchers_sold', v)}
                    />
                  </div>
                  <div>
                    <Label>Gutschein Eingelöst (eingelöst)</Label>
                    <CurrencyInput
                      value={formData.vouchers_redeemed}
                      onChange={(v) => updateField('vouchers_redeemed', v)}
                    />
                  </div>
                  <div>
                    <Label>FineDine Gutscheine</Label>
                    <CurrencyInput
                      value={formData.finedine_vouchers}
                      onChange={(v) => updateField('finedine_vouchers', v)}
                    />
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
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <span className="text-sm">{expense.description}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(expense.amount)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Summe Ausgaben:</span>
                        <span className="font-semibold tabular-nums text-destructive">
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bargeld Card */}
              <Card className={showCashBalanceCard ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    Bargeld
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Starting float (Wechselgeld) */}
                  <div>
                    <Label className="text-muted-foreground">Wechselgeld (Anfang)</Label>
                    <div className="text-lg font-semibold tabular-nums">
                      {formatCurrency(balances.initialRestaurant)}
                    </div>
                  </div>
                  
                  {/* Today's vault transfers if any */}
                  {todayVaultTransfers > 0 && (
                    <div>
                      <Label className="text-muted-foreground">+ Tresor-Transfer heute</Label>
                      <div className="text-lg font-semibold tabular-nums text-emerald-600">
                        +{formatCurrency(todayVaultTransfers)}
                      </div>
                    </div>
                  )}
                  
                  {/* Today's cash */}
                  <div>
                    <Label>Bargeld heute</Label>
                    <div className={`text-2xl font-bold tabular-nums ${bargeldPreview >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatCurrency(bargeldPreview)}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Projected balance */}
                  <div>
                    <Label>Kassenstand nach heute</Label>
                    <div className={`text-xl font-bold tabular-nums ${projectedRegisterBalance >= balances.initialRestaurant ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatCurrency(projectedRegisterBalance)}
                    </div>
                  </div>
                  
                  {showCashBalanceCard && (
                    <Button 
                      onClick={() => setShowTransferDialog(true)}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Vault className="w-4 h-4" />
                      Transfer vom Tresor
                    </Button>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Waiter Submissions Overview */}
            {waiterShifts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Kellner-Abrechnungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Eingereicht</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waiterShifts.map((shift) => {
                        const submittedAt = formatSubmittedAt((shift as any).submitted_at);
                        const hasData = (shift.pos_sales || 0) > 0 || (shift.cash_handed_in || 0) > 0;
                        
                        return (
                          <TableRow key={shift.id}>
                            <TableCell className="font-medium">{shift.waiter_name}</TableCell>
                            <TableCell>
                              {hasData ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Komplett
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  Ausstehend
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {submittedAt || '–'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}


            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateSession.isPending}
                size="lg"
              >
                Änderungen speichern
              </Button>
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
