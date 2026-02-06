import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, CreditCard, User, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { StatCard } from '@/components/shared/StatCard';
import { StaffSelect } from '@/components/shared/StaffSelect';
import { Button } from '@/components/ui/button';
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
  const [newKassiertBrutto, setNewKassiertBrutto] = useState(0);
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
        kassiert_brutto: newKassiertBrutto,
        card_total: newCardTotal,
        hilf_mahl: newHilfMahl,
        open_invoices: newOpenInvoices,
        cash_handed_in: newCashHandedIn,
      });

      // Reset form
      setNewWaiterName('');
      setNewPosSales(0);
      setNewKassiertBrutto(0);
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

  // Calculate expected cash: kassiert_brutto + hilf_mahl - open_invoices - card_total
  const calculateExpected = (shift: typeof waiterShifts[0]) => {
    return (shift.kassiert_brutto || 0) + shift.hilf_mahl - shift.open_invoices - shift.card_total;
  };

  // Calculate individual contribution to the tip pool
  const calculateContribution = (shift: typeof waiterShifts[0]) => {
    const expected = calculateExpected(shift);
    return shift.cash_handed_in - expected - shift.kitchen_tip;
  };

  // Calculate pool totals
  const waiterCount = waiterShifts.length;
  const totalPool = waiterShifts.reduce((sum, shift) => sum + calculateContribution(shift), 0);
  const tipPerWaiter = waiterCount > 0 ? totalPool / waiterCount : 0;
  const totalKitchenTip = waiterShifts.reduce((sum, shift) => sum + shift.kitchen_tip, 0);

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
          <div className="space-y-6">
            {/* Pool Stats */}
            {waiterShifts.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Kellner TG Pool"
                  value={totalPool}
                  icon={<Users className="w-5 h-5" />}
                  variant={totalPool >= 0 ? 'success' : 'error'}
                />
                <StatCard
                  label={`Pro Kellner (${waiterCount})`}
                  value={tipPerWaiter}
                  icon={<User className="w-5 h-5" />}
                  variant={tipPerWaiter >= 0 ? 'success' : 'error'}
                />
                <StatCard
                  label="Küchen TG Pool"
                  value={totalKitchenTip}
                  icon={<Users className="w-5 h-5" />}
                  variant="success"
                />
              </div>
            )}

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
                  <Label>Kellner auswählen</Label>
                  <StaffSelect
                    value={newWaiterName}
                    onValueChange={setNewWaiterName}
                    role="waiter"
                    placeholder="Kellner wählen"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>POS Umsatz</Label>
                    <CurrencyInput value={newPosSales} onChange={setNewPosSales} />
                  </div>
                  <div>
                    <Label>Kassiert Brutto</Label>
                    <CurrencyInput value={newKassiertBrutto} onChange={setNewKassiertBrutto} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kartenzahlung (KK)</Label>
                    <CurrencyInput value={newCardTotal} onChange={setNewCardTotal} />
                  </div>
                  <div>
                    <Label>Hilf Mahl</Label>
                    <CurrencyInput value={newHilfMahl} onChange={setNewHilfMahl} />
                  </div>
                </div>

                <div>
                  <Label>Offene Rechnungen</Label>
                  <CurrencyInput value={newOpenInvoices} onChange={setNewOpenInvoices} />
                </div>

                <div>
                  <Label>Bargeld abgegeben</Label>
                  <CurrencyInput value={newCashHandedIn} onChange={setNewCashHandedIn} />
                </div>

                {/* Preview Calculations */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Erwartet (Kassiert + HilfM - Offen - Karte):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newKassiertBrutto + newHilfMahl - newOpenInvoices - newCardTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Küchen Trinkgeld (2% vom POS):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newPosSales * 0.02)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kellner Trinkgeld:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(
                        newCashHandedIn - 
                        (newKassiertBrutto + newHilfMahl - newOpenInvoices - newCardTotal) - 
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
                          <TableHead className="text-right">POS</TableHead>
                          <TableHead className="text-right">Kassiert</TableHead>
                          <TableHead className="text-right">Karte</TableHead>
                          <TableHead className="text-right">HilfM</TableHead>
                          <TableHead className="text-right">Offen</TableHead>
                          <TableHead className="text-right">Erwartet</TableHead>
                          <TableHead className="text-right">Abgegeben</TableHead>
                          <TableHead className="text-right">Abweich.</TableHead>
                          <TableHead className="text-right">K.TG</TableHead>
                          <TableHead className="text-right">Beitrag</TableHead>
                          <TableHead className="text-right">Anteil</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waiterShifts.map((shift) => {
                          const expected = calculateExpected(shift);
                          const contribution = calculateContribution(shift);
                          const abweichung = shift.cash_handed_in - expected;
                          return (
                            <TableRow
                              key={shift.id}
                              className={selectedWaiterId === shift.id ? 'bg-muted' : ''}
                              onClick={() => setSelectedWaiterId(shift.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <TableCell className="font-medium">{shift.waiter_name}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.pos_sales)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.kassiert_brutto || 0)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.card_total)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.hilf_mahl)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.open_invoices)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(expected)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.cash_handed_in)}</TableCell>
                              <TableCell className={`text-right tabular-nums font-semibold ${abweichung < 0 ? 'text-destructive' : abweichung > 0 ? 'text-success' : ''}`}>
                                {abweichung > 0 ? '+' : ''}{formatCurrency(abweichung)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.kitchen_tip)}</TableCell>
                              <TableCell className={`text-right tabular-nums ${contribution >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {contribution >= 0 ? '+' : ''}{formatCurrency(contribution)}
                              </TableCell>
                              <TableCell className={`text-right tabular-nums font-semibold ${tipPerWaiter >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(tipPerWaiter)}
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
                        {/* Totals Row */}
                        {waiterShifts.length > 0 && (
                          <TableRow className="bg-muted/50 font-semibold border-t-2">
                            <TableCell>GESAMT</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + s.pos_sales, 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + (s.kassiert_brutto || 0), 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + s.card_total, 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + s.hilf_mahl, 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + s.open_invoices, 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + calculateExpected(s), 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + s.cash_handed_in, 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(waiterShifts.reduce((sum, s) => sum + (s.cash_handed_in - calculateExpected(s)), 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(totalKitchenTip)}
                            </TableCell>
                            <TableCell className={`text-right tabular-nums ${totalPool >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(totalPool)}
                            </TableCell>
                            <TableCell className={`text-right tabular-nums ${totalPool >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(totalPool)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
