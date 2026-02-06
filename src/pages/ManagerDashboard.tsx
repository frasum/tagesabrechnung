import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Settings, Truck, Receipt, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useSession,
  useCreateSession,
  useUpdateSession,
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
} from '@/hooks/useSession';

export default function ManagerDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    spicery_counter: 0,
    pos_total: 0,
    terminal_1_total: 0,
    terminal_2_total: 0,
    ordersmart_revenue: 0,
    gustoco_revenue: 0,
    orderhut_revenue: 0,
    wolt_revenue: 0,
    ubereats_revenue: 0,
    vouchers_sold: 0,
    vouchers_redeemed: 0,
    finedine_vouchers: 0,
    opentabs_deduction: 0,
    vorschuss: 0,
    einladung: 0,
    sonstige_einnahme: 0,
    notes: '',
  });

  // Expense form
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate);
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const { data: expenses = [] } = useExpenses(session?.id);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  // Sync form data with session
  useEffect(() => {
    if (session) {
      setFormData({
        spicery_counter: session.spicery_counter || 0,
        pos_total: session.pos_total || 0,
        terminal_1_total: session.terminal_1_total || 0,
        terminal_2_total: session.terminal_2_total || 0,
        ordersmart_revenue: session.ordersmart_revenue || 0,
        gustoco_revenue: session.gustoco_revenue || 0,
        orderhut_revenue: session.orderhut_revenue || 0,
        wolt_revenue: session.wolt_revenue || 0,
        ubereats_revenue: session.ubereats_revenue || 0,
        vouchers_sold: session.vouchers_sold || 0,
        vouchers_redeemed: session.vouchers_redeemed || 0,
        finedine_vouchers: session.finedine_vouchers || 0,
        opentabs_deduction: session.opentabs_deduction || 0,
        vorschuss: session.vorschuss || 0,
        einladung: session.einladung || 0,
        sonstige_einnahme: session.sonstige_einnahme || 0,
        notes: session.notes || '',
      });
    } else {
      setFormData({
        spicery_counter: 0,
        pos_total: 0,
        terminal_1_total: 0,
        terminal_2_total: 0,
        ordersmart_revenue: 0,
        gustoco_revenue: 0,
        orderhut_revenue: 0,
        wolt_revenue: 0,
        ubereats_revenue: 0,
        vouchers_sold: 0,
        vouchers_redeemed: 0,
        finedine_vouchers: 0,
        opentabs_deduction: 0,
        vorschuss: 0,
        einladung: 0,
        sonstige_einnahme: 0,
        notes: '',
      });
    }
  }, [session]);

  const handleCreateSession = async () => {
    try {
      await createSession.mutateAsync(selectedDate);
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

  const updateField = (field: keyof typeof formData, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
                    <Label>Spicery Zählerstand</Label>
                    <CurrencyInput
                      value={formData.spicery_counter}
                      onChange={(v) => updateField('spicery_counter', v)}
                    />
                  </div>
                  <div>
                    <Label>POS Gesamtumsatz</Label>
                    <CurrencyInput
                      value={formData.pos_total}
                      onChange={(v) => updateField('pos_total', v)}
                    />
                  </div>
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
                </CardContent>
              </Card>

              {/* Delivery Platforms */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Lieferplattformen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>OrderSmart</Label>
                    <CurrencyInput
                      value={formData.ordersmart_revenue}
                      onChange={(v) => updateField('ordersmart_revenue', v)}
                    />
                  </div>
                  <div>
                    <Label>Gustoco</Label>
                    <CurrencyInput
                      value={formData.gustoco_revenue}
                      onChange={(v) => updateField('gustoco_revenue', v)}
                    />
                  </div>
                  <div>
                    <Label>Orderhut</Label>
                    <CurrencyInput
                      value={formData.orderhut_revenue}
                      onChange={(v) => updateField('orderhut_revenue', v)}
                    />
                  </div>
                  <div>
                    <Label>Wolt</Label>
                    <CurrencyInput
                      value={formData.wolt_revenue}
                      onChange={(v) => updateField('wolt_revenue', v)}
                    />
                  </div>
                  <div>
                    <Label>UberEats</Label>
                    <CurrencyInput
                      value={formData.ubereats_revenue}
                      onChange={(v) => updateField('ubereats_revenue', v)}
                    />
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
                    <Label>Gutschein VK (verkauft)</Label>
                    <CurrencyInput
                      value={formData.vouchers_sold}
                      onChange={(v) => updateField('vouchers_sold', v)}
                    />
                  </div>
                  <div>
                    <Label>Gutschein EL (eingelöst)</Label>
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
                  <div>
                    <Label>OpenTabs Abzug</Label>
                    <CurrencyInput
                      value={formData.opentabs_deduction}
                      onChange={(v) => updateField('opentabs_deduction', v)}
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
                    rows={6}
                  />
                </CardContent>
              </Card>
            </div>

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
    </AppLayout>
  );
}
