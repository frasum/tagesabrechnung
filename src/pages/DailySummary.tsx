import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSelectedDate } from '@/contexts/DateContext';
import { Plus, FileText, Euro, CreditCard, Truck, Receipt, Download, Banknote, Vault } from 'lucide-react';
import { generateDailySummaryPDF } from '@/utils/pdfExport';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/contexts/AuthContext';
import { useRegisterTransfers } from '@/hooks/useRegisterTransfers';
import { TransferDialog } from '@/components/register/TransferDialog';
import {
  useSession,
  useCreateSession,
  useWaiterShifts,
  useKitchenShifts,
  useExpenses,
} from '@/hooks/useSession';

export default function DailySummary() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId, restaurantName } = useRestaurant();
  const { user } = useAuth();
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate, restaurantId);
  const createSession = useCreateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const { data: kitchenShifts = [] } = useKitchenShifts(session?.id);
  const { data: expenses = [] } = useExpenses(session?.id);
  
  // Cash balance hooks
  const { transfers, balances, createTransfer, isCreating } = useRegisterTransfers(restaurantId);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  // Calculate totals
  const kellnerUmsatz = waiterShifts.reduce((sum, w) => sum + w.pos_sales, 0);
  const totalCardTotal = waiterShifts.reduce((sum, w) => sum + w.card_total, 0) 
    + (session?.card_total_gl || 0);
  const totalHilfMahl = waiterShifts.reduce((sum, w) => sum + w.hilf_mahl, 0);
  const totalOpenInvoices = waiterShifts.reduce((sum, w) => sum + w.open_invoices, 0);
  const totalKitchenTip = waiterShifts.reduce((sum, w) => sum + w.kitchen_tip, 0);
  
  // Waiter tip pool calculation
  const calculateExpected = (w: typeof waiterShifts[0]) => 
    (w.kassiert_brutto || 0) + w.hilf_mahl - w.open_invoices - w.card_total;
  const waiterTipPool = waiterShifts.reduce((sum, w) => 
    sum + (w.cash_handed_in - calculateExpected(w) - w.kitchen_tip), 0);
  const waiterCount = waiterShifts.length;
  const tipPerWaiter = waiterCount > 0 ? waiterTipPool / waiterCount : 0;
  
  // Keep totalWaiterTip for backward compatibility in calculations
  const totalWaiterTip = waiterTipPool;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Delivery revenue
  const totalDeliveryRevenue = session
    ? (session.ordersmart_revenue || 0) +
      (session.wolt_revenue || 0) +
      (session.takeaway_total || 0)
    : 0;

  // BARGELD calculation - uses pos_total (Vectron total) as base
  // BARGELD = pos_total + vouchers_sold - terminals - ordersmart - wolt 
  //           - vouchers_redeemed - finedine - einladung - open_invoices - vorschuss - expenses
  const bargeld = session
    ? (session.pos_total || 0) +
      (session.vouchers_sold || 0) -
      (session.terminal_1_total || 0) -
      (session.terminal_2_total || 0) -
      (session.ordersmart_revenue || 0) -
      (session.wolt_revenue || 0) -
      (session.vouchers_redeemed || 0) -
      (session.finedine_vouchers || 0) -
      (session.einladung || 0) -
      totalOpenInvoices -
      (session.vorschuss || 0) -
      totalExpenses
    : 0;

  // POS Mismatch: Check if POS total matches sum of waiter POS sales (kept for PDF export)
  const posMismatch = session ? (session.pos_total || 0) - kellnerUmsatz : 0;

  // Card Terminal Mismatch: Check if terminals match waiter card totals (kept for PDF export)
  const terminalTotal = session ? (session.terminal_1_total || 0) + (session.terminal_2_total || 0) : 0;
  const cardTerminalMismatch = terminalTotal - totalCardTotal;

  // Simplified daily cash balance calculation
  const initialRestaurantBalance = balances.initialRestaurant; // 1.000 €
  
  const todaysVaultTransfers = useMemo(() => {
    return transfers
      .filter(t => t.direction === 'to_restaurant' && t.transfer_date === selectedDateStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transfers, selectedDateStr]);

  const todaysRegisterBalance = initialRestaurantBalance + bargeld + todaysVaultTransfers;
  const showCashBalanceCard = todaysRegisterBalance < initialRestaurantBalance; // nur zeigen wenn < 1.000 €

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
      session,
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
                value={kellnerUmsatz}
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

            {/* Kassenstand Card - nur anzeigen wenn Kassenstand < 1.000 € */}
            {showCashBalanceCard && (
              <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="w-5 h-5" />
                    Kassenstand
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Anfangsbestand */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Anfangsbestand</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(initialRestaurantBalance)}
                    </span>
                  </div>

                  {/* Bargeld heute */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bargeld heute</span>
                    <span className={`font-semibold tabular-nums ${bargeld >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatCurrency(bargeld)}
                    </span>
                  </div>

                  {/* Transfer vom Tresor heute */}
                  {todaysVaultTransfers > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Transfer Tresor</span>
                      <span className="font-semibold tabular-nums text-blue-600">
                        +{formatCurrency(todaysVaultTransfers)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  {/* Kassenstand Ende des Tages */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Kassenstand</span>
                    <span className={`text-lg font-bold tabular-nums ${todaysRegisterBalance >= initialRestaurantBalance ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatCurrency(todaysRegisterBalance)}
                    </span>
                  </div>

                  {/* Transfer-Button nur wenn noch unter 1.000 € */}
                  {todaysRegisterBalance < initialRestaurantBalance && (
                    <Button onClick={() => setShowTransferDialog(true)} variant="outline" className="w-full gap-2">
                      <Vault className="w-4 h-4" />
                      Transfer vom Tresor
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Detailed Breakdown */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Einnahmen Übersicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Tagesumsatz</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(kellnerUmsatz)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gutschein Verkauf</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.vouchers_sold || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sonstige Einnahmen</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.sonstige_einnahme || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Hilf Mahl</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(totalHilfMahl)}</TableCell>
                      </TableRow>
                      <TableRow className="border-t-2">
                        <TableCell className="font-semibold">Summe Einnahmen</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-success">
                          {formatCurrency(kellnerUmsatz + (session.vouchers_sold || 0) + (session.sonstige_einnahme || 0) + totalHilfMahl)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Deductions Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Abzüge Übersicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Kredit Karten Terminal 1</TableCell>
                         <TableCell className="text-right tabular-nums">{formatCurrency(session.terminal_1_total || 0)}</TableCell>
                       </TableRow>
                       <TableRow>
                         <TableCell>Kredit Karten Terminal 2</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.terminal_2_total || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gutschein Eingelöst</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.vouchers_redeemed || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>FineDine Gutscheine</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.finedine_vouchers || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Vorschuss</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.vorschuss || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Einladung</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.einladung || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Offene Rechnungen</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(totalOpenInvoices)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Ausgaben</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(totalExpenses)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Take Away</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(totalDeliveryRevenue)}</TableCell>
                      </TableRow>
                      <TableRow className="border-t-2">
                        <TableCell className="font-semibold">Summe Abzüge</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-destructive">
                          {formatCurrency(
                            (session.terminal_1_total || 0) +
                            (session.terminal_2_total || 0) +
                            (session.vouchers_redeemed || 0) +
                            (session.finedine_vouchers || 0) +
                            (session.vorschuss || 0) +
                            (session.einladung || 0) +
                            totalOpenInvoices +
                            totalExpenses +
                            totalDeliveryRevenue
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Delivery Platforms */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Take Away Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Takeaway GL</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.takeaway_total || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>OrderSmart</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.ordersmart_revenue || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Wolt</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.wolt_revenue || 0)}</TableCell>
                      </TableRow>
                      <TableRow className="border-t-2">
                        <TableCell className="font-semibold">Gesamt</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totalDeliveryRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Tips Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Trinkgeld Übersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Küchen Trinkgeld (2%)</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-success">{formatCurrency(totalKitchenTip)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Kellner Trinkgeld Pool</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-success">{formatCurrency(waiterTipPool)}</TableCell>
                      </TableRow>
                      {waiterCount > 0 && (
                        <TableRow>
                          <TableCell className="pl-6 text-muted-foreground">→ Pro Kellner ({waiterCount})</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-success">{formatCurrency(tipPerWaiter)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t-2">
                        <TableCell className="font-semibold">Gesamt Trinkgeld</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-success">{formatCurrency(totalKitchenTip + totalWaiterTip)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Waiter Pool Distribution */}
                  {waiterShifts.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Kellner Pool-Verteilung ({waiterCount} Kellner)</p>
                      <div className="space-y-1">
                        {waiterShifts.map((shift) => {
                          const contribution = shift.cash_handed_in - calculateExpected(shift) - shift.kitchen_tip;
                          return (
                            <div key={shift.id} className="flex justify-between text-sm">
                              <span>{shift.waiter_name}</span>
                              <div className="flex gap-4">
                                <span className={`tabular-nums ${contribution >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(contribution)}
                                </span>
                                <span className="tabular-nums text-success">
                                  → {formatCurrency(tipPerWaiter)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
