import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, CreditCard, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  useSession,
  useCreateSession,
  useWaiterShifts,
  useCreateWaiterShift,
  useDeleteWaiterShift,
  useCardTransactions,
  useCreateCardTransaction,
  useDeleteCardTransaction,
} from '@/hooks/useSession';

const CARD_TYPES = ['EC', 'Visa', 'Amex', 'Maestro'] as const;

export default function WaiterCashUp() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state for new waiter
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newPosSales, setNewPosSales] = useState(0);
  const [newCardTotal, setNewCardTotal] = useState(0);
  const [newHilfMahl, setNewHilfMahl] = useState(0);
  const [newOpenInvoices, setNewOpenInvoices] = useState(0);
  const [newCashHandedIn, setNewCashHandedIn] = useState(0);

  // Card transaction form
  const [newCardType, setNewCardType] = useState<typeof CARD_TYPES[number]>('EC');
  const [newCardAmount, setNewCardAmount] = useState(0);

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate);
  const createSession = useCreateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const createWaiterShift = useCreateWaiterShift();
  const deleteWaiterShift = useDeleteWaiterShift();
  const { data: cardTransactions = [] } = useCardTransactions(selectedWaiterId || undefined);
  const createCardTransaction = useCreateCardTransaction();
  const deleteCardTransaction = useDeleteCardTransaction();

  const selectedWaiter = waiterShifts.find(w => w.id === selectedWaiterId);

  const handleCreateSession = async () => {
    try {
      await createSession.mutateAsync(selectedDate);
      toast({ title: 'Session erstellt', description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' });
    }
  };

  const handleAddWaiter = async () => {
    if (!session?.id || !newWaiterName.trim()) {
      toast({ title: 'Fehler', description: 'Bitte Namen eingeben.', variant: 'destructive' });
      return;
    }

    try {
      await createWaiterShift.mutateAsync({
        session_id: session.id,
        waiter_name: newWaiterName.trim(),
        pos_sales: newPosSales,
        card_total: newCardTotal,
        hilf_mahl: newHilfMahl,
        open_invoices: newOpenInvoices,
        cash_handed_in: newCashHandedIn,
      });

      // Reset form
      setNewWaiterName('');
      setNewPosSales(0);
      setNewCardTotal(0);
      setNewHilfMahl(0);
      setNewOpenInvoices(0);
      setNewCashHandedIn(0);

      toast({ title: 'Kellner hinzugefügt', description: `${newWaiterName} wurde hinzugefügt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Kellner konnte nicht hinzugefügt werden.', variant: 'destructive' });
    }
  };

  const handleDeleteWaiter = async (id: string) => {
    if (!session?.id) return;
    try {
      await deleteWaiterShift.mutateAsync({ id, sessionId: session.id });
      if (selectedWaiterId === id) setSelectedWaiterId(null);
      toast({ title: 'Kellner gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const handleAddCardTransaction = async () => {
    if (!selectedWaiterId || newCardAmount <= 0) return;

    try {
      await createCardTransaction.mutateAsync({
        waiter_shift_id: selectedWaiterId,
        card_type: newCardType,
        amount: newCardAmount,
      });
      setNewCardAmount(0);
      toast({ title: 'Kartenzahlung hinzugefügt' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const handleDeleteCardTransaction = async (id: string) => {
    if (!selectedWaiterId) return;
    try {
      await deleteCardTransaction.mutateAsync({ id, waiterShiftId: selectedWaiterId });
      toast({ title: 'Kartenzahlung gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  // Calculate waiter tip: cash handed in - differenz - kitchen tip
  const calculateWaiterTip = (shift: typeof waiterShifts[0]) => {
    return shift.cash_handed_in - shift.differenz - shift.kitchen_tip;
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
              Kellner Abrechnung
            </h1>
            <p className="text-muted-foreground mt-1">
              Tägliche Kassenabrechnung für jeden Kellner
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
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Add Waiter Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Neuen Kellner hinzufügen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="waiterName">Name</Label>
                  <Input
                    id="waiterName"
                    value={newWaiterName}
                    onChange={(e) => setNewWaiterName(e.target.value)}
                    placeholder="Kellner Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>POS Umsatz</Label>
                    <CurrencyInput value={newPosSales} onChange={setNewPosSales} />
                  </div>
                  <div>
                    <Label>Kartenzahlung (KK)</Label>
                    <CurrencyInput value={newCardTotal} onChange={setNewCardTotal} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hilf Mahl</Label>
                    <CurrencyInput value={newHilfMahl} onChange={setNewHilfMahl} />
                  </div>
                  <div>
                    <Label>Offene Rechnungen</Label>
                    <CurrencyInput value={newOpenInvoices} onChange={setNewOpenInvoices} />
                  </div>
                </div>

                <div>
                  <Label>Bargeld abgegeben</Label>
                  <CurrencyInput value={newCashHandedIn} onChange={setNewCashHandedIn} />
                </div>

                {/* Preview Calculations */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Differenz:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newPosSales + newHilfMahl - newOpenInvoices - newCardTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Küchen Trinkgeld (2%):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newPosSales * 0.02)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kellner Trinkgeld:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(
                        newCashHandedIn - 
                        (newPosSales + newHilfMahl - newOpenInvoices - newCardTotal) - 
                        (newPosSales * 0.02)
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAddWaiter}
                  disabled={!newWaiterName.trim() || createWaiterShift.isPending}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Kellner hinzufügen
                </Button>
              </CardContent>
            </Card>

            {/* Card Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Kartenzahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedWaiterId ? (
                  <p className="text-muted-foreground text-center py-8">
                    Wählen Sie einen Kellner aus der Liste, um Kartenzahlungen hinzuzufügen.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Kartenzahlungen für: <strong>{selectedWaiter?.waiter_name}</strong>
                    </p>

                    {/* Add Card Transaction */}
                    <div className="flex gap-2">
                      <Select value={newCardType} onValueChange={(v) => setNewCardType(v as typeof CARD_TYPES[number])}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CARD_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <CurrencyInput
                        value={newCardAmount}
                        onChange={setNewCardAmount}
                        className="flex-1"
                      />
                      <Button onClick={handleAddCardTransaction} disabled={newCardAmount <= 0}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Card Transactions List */}
                    {cardTransactions.length > 0 && (
                      <div className="space-y-2">
                        {cardTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                                {tx.card_type}
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCardTransaction(tx.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium">Summe:</span>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(cardTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiter Shifts Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Kellner Übersicht</CardTitle>
              </CardHeader>
              <CardContent>
                {waiterShifts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Kellner für diesen Tag hinzugefügt.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">POS Umsatz</TableHead>
                          <TableHead className="text-right">Karte (KK)</TableHead>
                          <TableHead className="text-right">Hilf Mahl</TableHead>
                          <TableHead className="text-right">Offene Rg.</TableHead>
                          <TableHead className="text-right">Bargeld</TableHead>
                          <TableHead className="text-right">Differenz</TableHead>
                          <TableHead className="text-right">Küchen TG</TableHead>
                          <TableHead className="text-right">Kellner TG</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waiterShifts.map((shift) => {
                          const waiterTip = calculateWaiterTip(shift);
                          return (
                            <TableRow
                              key={shift.id}
                              className={selectedWaiterId === shift.id ? 'bg-muted' : ''}
                              onClick={() => setSelectedWaiterId(shift.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <TableCell className="font-medium">{shift.waiter_name}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.pos_sales)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.card_total)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.hilf_mahl)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.open_invoices)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.cash_handed_in)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.differenz)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.kitchen_tip)}</TableCell>
                              <TableCell className={`text-right tabular-nums font-medium ${waiterTip < 0 ? 'text-destructive' : 'text-success'}`}>
                                {formatCurrency(waiterTip)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWaiter(shift.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
