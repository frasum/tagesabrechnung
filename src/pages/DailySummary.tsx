import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, FileText, Euro, CreditCard, Truck, Receipt, Download, HelpCircle, ChevronDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { generateDailySummaryPDF } from '@/utils/pdfExport';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  useSession,
  useCreateSession,
  useWaiterShifts,
  useKitchenShifts,
  useExpenses,
} from '@/hooks/useSession';

export default function DailySummary() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { toast } = useToast();

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate);
  const createSession = useCreateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const { data: kitchenShifts = [] } = useKitchenShifts(session?.id);
  const { data: expenses = [] } = useExpenses(session?.id);

  // Calculate totals
  const kellnerUmsatz = waiterShifts.reduce((sum, w) => sum + w.pos_sales, 0);
  const totalCardTotal = waiterShifts.reduce((sum, w) => sum + w.card_total, 0);
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

  // BARGELD calculation
  // BARGELD = kellner umsatz + gutschein VK + sonstige einnahme - terminal 1 - terminal 2 
  // - gutschein EL - vorschuss - einladung - open invoices - expenses + hilf mahl 
  // - all delivery platforms - finedine
  const bargeld = session
    ? kellnerUmsatz +
      (session.vouchers_sold || 0) +
      (session.sonstige_einnahme || 0) -
      (session.terminal_1_total || 0) -
      (session.terminal_2_total || 0) -
      (session.vouchers_redeemed || 0) -
      (session.vorschuss || 0) -
      (session.einladung || 0) -
      totalOpenInvoices -
      totalExpenses +
      totalHilfMahl -
      totalDeliveryRevenue -
      (session.finedine_vouchers || 0)
    : 0;

  // POS Mismatch: Check if POS total matches sum of waiter POS sales (kept for PDF export)
  const posMismatch = session ? (session.pos_total || 0) - kellnerUmsatz : 0;

  // Card Terminal Mismatch: Check if terminals match waiter card totals (kept for PDF export)
  const terminalTotal = session ? (session.terminal_1_total || 0) + (session.terminal_2_total || 0) : 0;
  const cardTerminalMismatch = terminalTotal - totalCardTotal;

  const handleCreateSession = async () => {
    try {
      await createSession.mutateAsync(selectedDate);
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
            {/* Main Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="BARGELD"
                value={bargeld}
                icon={<Euro className="w-5 h-5" />}
                variant={bargeld >= 0 ? 'success' : 'error'}
              />
              <StatCard
                label="Kellner Umsatz"
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
                        <TableCell>Kellner Umsatz</TableCell>
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
                        <TableCell>KK Terminal 1</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(session.terminal_1_total || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>KK Terminal 2</TableCell>
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
                                <span className={`tabular-nums text-xs ${contribution >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                                  (Beitrag: {contribution >= 0 ? '+' : ''}{formatCurrency(contribution)})
                                </span>
                                <span className="tabular-nums font-medium">{formatCurrency(tipPerWaiter)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {kitchenShifts.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Küchenpersonal ({kitchenShifts.length} Mitarbeiter)</p>
                      <div className="space-y-1">
                        {kitchenShifts.map((shift) => {
                          const totalHours = kitchenShifts.reduce((sum, s) => sum + s.hours_worked, 0);
                          const tipAmount = totalHours > 0 ? (shift.hours_worked / totalHours) * totalKitchenTip : 0;
                          return (
                            <div key={shift.id} className="flex justify-between text-sm">
                              <span>{shift.staff_name}</span>
                              <span className="tabular-nums">{formatCurrency(tipAmount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Formula Explanation */}
            <Collapsible className="group" defaultOpen={true}>
              <Card className="border-muted">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-muted-foreground" />
                        Wie wird BARGELD berechnet?
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Formula */}
                    <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
                      <p className="font-semibold text-foreground mb-2">Formel:</p>
                      <p className="text-success">+ Kellner Umsatz</p>
                      <p className="text-success">+ Gutschein VK</p>
                      <p className="text-success">+ Sonstige Einnahmen</p>
                      <p className="text-success">+ Hilf Mahl</p>
                      <p className="text-destructive">− Terminal 1 + 2</p>
                      <p className="text-destructive">− OpenTabs Abzug</p>
                      <p className="text-destructive">− Gutschein EL</p>
                      <p className="text-destructive">− FineDine Gutscheine</p>
                      <p className="text-destructive">− Vorschuss</p>
                      <p className="text-destructive">− Einladung</p>
                      <p className="text-destructive">− Offene Rechnungen</p>
                      <p className="text-destructive">− Ausgaben</p>
                      <p className="text-destructive">− Take Away</p>
                      <p className="border-t border-border mt-2 pt-2 font-bold">= BARGELD</p>
                    </div>

                    {/* Live Calculation */}
                    <div className="space-y-2">
                      <p className="font-semibold text-sm text-muted-foreground">Aktuelle Berechnung:</p>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-success">+ Kellner Umsatz</TableCell>
                            <TableCell className="text-right tabular-nums text-success">{formatCurrency(kellnerUmsatz)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-success">+ Gutschein Verkauf</TableCell>
                            <TableCell className="text-right tabular-nums text-success">{formatCurrency(session?.vouchers_sold || 0)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-success">+ Sonstige Einnahmen</TableCell>
                            <TableCell className="text-right tabular-nums text-success">{formatCurrency(session?.sonstige_einnahme || 0)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-success">+ Hilf Mahl</TableCell>
                            <TableCell className="text-right tabular-nums text-success">{formatCurrency(totalHilfMahl)}</TableCell>
                          </TableRow>
                          <TableRow className="border-t">
                            <TableCell className="font-medium">Summe Einnahmen</TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-success">
                              {formatCurrency(kellnerUmsatz + (session?.vouchers_sold || 0) + (session?.sonstige_einnahme || 0) + totalHilfMahl)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Terminals (1+2)</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency((session?.terminal_1_total || 0) + (session?.terminal_2_total || 0))}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Gutschein Eingelöst + FineDine</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency((session?.vouchers_redeemed || 0) + (session?.finedine_vouchers || 0))}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Vorschuss + Einladung</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency((session?.vorschuss || 0) + (session?.einladung || 0))}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Offene Rechnungen</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(totalOpenInvoices)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Ausgaben</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(totalExpenses)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-destructive">− Take Away</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(totalDeliveryRevenue)}</TableCell>
                          </TableRow>
                          <TableRow className="border-t-2 bg-muted/30">
                            <TableCell className="font-bold text-lg">= BARGELD</TableCell>
                            <TableCell className={`text-right tabular-nums font-bold text-lg ${bargeld >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(bargeld)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Final Result */}
            <Card className={bargeld >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
              <CardContent className="py-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  {bargeld >= 0 ? (
                    <CheckCircle className="w-8 h-8 text-success" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  )}
                  <h2 className="text-2xl font-display font-bold">BARGELD</h2>
                </div>
                <p className={`text-4xl font-display font-bold tabular-nums ${bargeld >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(bargeld)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
