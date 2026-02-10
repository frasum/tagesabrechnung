import { useState } from 'react';
import { format } from 'date-fns';
import { useSelectedDate } from '@/contexts/DateContext';
import { useAuth } from '@/contexts/AuthContext';
import { isSessionLocked } from '@/utils/businessDate';
import { SessionLockedBanner } from '@/components/shared/SessionLockedBanner';
import { Pencil, Percent, Plus, Trash2, User, Users, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { StatCard } from '@/components/shared/StatCard';
import { StaffSelect } from '@/components/shared/StaffSelect';
import { SecondWaiterSelect } from '@/components/shared/SecondWaiterSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSession, useCreateSession, useWaiterShifts, useCreateWaiterShift, useDeleteWaiterShift, useWaiterTipAverages } from '@/hooks/useSession';
import { useUpdateWaiterShiftWithAudit } from '@/hooks/useWaiterShiftAudit';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLabels } from '@/hooks/useLabels';
import type { WaiterShift } from '@/types/database';

export default function WaiterCashUp() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId } = useRestaurant();
  const { user } = useAuth();
  const locked = isSessionLocked(selectedDate, user?.permissionLevel || 'staff');

  // Form state for new waiter
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newPosSales, setNewPosSales] = useState(0);
  const [newKassiertBrutto, setNewKassiertBrutto] = useState(0);
  const [newCardTotal, setNewCardTotal] = useState(0);
  const [newHilfMahl, setNewHilfMahl] = useState(0);
  const [newOpenInvoices, setNewOpenInvoices] = useState(0);
  const [newCashHandedIn, setNewCashHandedIn] = useState(0);
  const [newSecondWaiterName, setNewSecondWaiterName] = useState('none');
  const [newParticipatesInPool, setNewParticipatesInPool] = useState(true);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);


  // Data hooks
  const {
    data: session,
    isLoading: sessionLoading
  } = useSession(selectedDate, restaurantId);
  const createSession = useCreateSession();
  const {
    data: waiterShifts = []
  } = useWaiterShifts(session?.id);
  const createWaiterShift = useCreateWaiterShift();
  const deleteWaiterShift = useDeleteWaiterShift();
  const updateWaiterShift = useUpdateWaiterShiftWithAudit();
  const { data: waiterTipAverages = {} } = useWaiterTipAverages(restaurantId);
  const { getLabel } = useLabels(restaurantId);

  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId });
      toast({
        title: 'Session erstellt',
        description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.`
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht erstellt werden.',
        variant: 'destructive'
      });
    }
  };
  const resetForm = () => {
    setNewWaiterName('');
    setNewSecondWaiterName('none');
    setNewParticipatesInPool(true);
    setNewPosSales(0);
    setNewKassiertBrutto(0);
    setNewCardTotal(0);
    setNewHilfMahl(0);
    setNewOpenInvoices(0);
    setNewCashHandedIn(0);
    setEditingShiftId(null);
  };

  const handleEditWaiter = (shift: WaiterShift) => {
    setEditingShiftId(shift.id);
    setNewWaiterName(shift.waiter_name);
    setNewSecondWaiterName(shift.second_waiter_name || 'none');
    setNewParticipatesInPool(shift.participates_in_pool ?? true);
    setNewPosSales(shift.pos_sales || 0);
    setNewKassiertBrutto(shift.kassiert_brutto || 0);
    setNewCardTotal(shift.card_total || 0);
    setNewHilfMahl(shift.hilf_mahl || 0);
    setNewOpenInvoices(shift.open_invoices || 0);
    setNewCashHandedIn(shift.cash_handed_in || 0);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSaveWaiter = async () => {
    if (!session?.id || !newWaiterName.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte Namen eingeben.',
        variant: 'destructive'
      });
      return;
    }

    // Validate: second waiter cannot be the same as primary waiter
    if (newSecondWaiterName !== 'none' && newSecondWaiterName === newWaiterName.trim()) {
      toast({
        title: 'Fehler',
        description: 'Der zweite Kellner kann nicht die gleiche Person sein.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingShiftId) {
        // Update existing
        await updateWaiterShift.mutateAsync({
          id: editingShiftId,
          sessionId: session.id,
          restaurantId: restaurantId!,
          waiter_name: newWaiterName.trim(),
          second_waiter_name: newSecondWaiterName,
          participates_in_pool: newParticipatesInPool,
          pos_sales: newPosSales,
          kassiert_brutto: newKassiertBrutto,
          card_total: newCardTotal,
          hilf_mahl: newHilfMahl,
          open_invoices: newOpenInvoices,
          cash_handed_in: newCashHandedIn
        });
        toast({
          title: 'Kellner aktualisiert',
          description: `${newWaiterName} wurde aktualisiert.`
        });
      } else {
        // Create new
        await createWaiterShift.mutateAsync({
          session_id: session.id,
          waiter_name: newWaiterName.trim(),
          second_waiter_name: newSecondWaiterName,
          participates_in_pool: newParticipatesInPool,
          pos_sales: newPosSales,
          kassiert_brutto: newKassiertBrutto,
          card_total: newCardTotal,
          hilf_mahl: newHilfMahl,
          open_invoices: newOpenInvoices,
          cash_handed_in: newCashHandedIn
        });
        toast({
          title: 'Kellner hinzugefügt',
          description: `${newWaiterName} wurde hinzugefügt.`
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: editingShiftId ? 'Kellner konnte nicht aktualisiert werden.' : 'Kellner konnte nicht hinzugefügt werden.',
        variant: 'destructive'
      });
    }
  };
  const handleDeleteWaiter = async (id: string) => {
    if (!session?.id) return;
    try {
      await deleteWaiterShift.mutateAsync({
        id,
        sessionId: session.id
      });
      
      toast({
        title: 'Kellner gelöscht'
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        variant: 'destructive'
      });
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

  // Calculate pool totals (team shifts count as 2 shares, only if participates_in_pool)
  const waiterShareCount = waiterShifts.reduce((count, shift) => {
    if (!shift.participates_in_pool) return count;
    return count + (shift.second_waiter_name ? 2 : 1);
  }, 0);
  const totalPool = waiterShifts.reduce((sum, shift) => sum + calculateContribution(shift), 0);
  const tipPerWaiter = waiterShareCount > 0 ? totalPool / waiterShareCount : 0;
  const totalKitchenTip = waiterShifts.reduce((sum, shift) => sum + shift.kitchen_tip, 0);
  const totalSales = waiterShifts.reduce((sum, s) => sum + s.pos_sales, 0);
  const totalTip = totalPool + totalKitchenTip;
  const tipPercentage = totalSales > 0 ? (totalTip / totalSales) * 100 : 0;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };
  if (sessionLoading) {
    return <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Laden...</div>
        </div>
      </AppLayout>;
  }
  return <AppLayout>
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
        {!session && <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Keine Session für diesen Tag vorhanden.
              </p>
              <Button onClick={handleCreateSession} disabled={createSession.isPending || !restaurantId}>
                <Plus className="w-4 h-4 mr-2" />
                Session erstellen
              </Button>
            </CardContent>
          </Card>}

        {/* Session Content */}
        {session && <div className="space-y-6">

            {locked && <SessionLockedBanner />}

            <div className="grid lg:grid-cols-2 gap-6">
            {/* Add/Edit Waiter Form */}
            {!locked && (
            <Card className={editingShiftId ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {editingShiftId ? (
                      <>
                        <Pencil className="w-5 h-5" />
                        Kellner bearbeiten: {newWaiterName}
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5" />
                        Neuen Kellner hinzufügen
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="participates-in-pool"
                      checked={newParticipatesInPool}
                      onCheckedChange={(checked) => {
                        const participates = checked === true;
                        setNewParticipatesInPool(participates);
                        if (!participates) {
                          setNewSecondWaiterName('none');
                        }
                      }}
                    />
                    <Label htmlFor="participates-in-pool" className="text-sm font-normal cursor-pointer">
                      Am Pool beteiligt
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Kellner auswählen</Label>
                  <StaffSelect value={newWaiterName} onValueChange={setNewWaiterName} role="waiter" placeholder="Kellner wählen" excludeNames={waiterShifts.filter(s => s.id !== editingShiftId).map(s => s.waiter_name)} restaurantId={restaurantId} />
                </div>

                {newParticipatesInPool && (
                  <div>
                    <Label>Zweiter Kellner (optional)</Label>
                    <SecondWaiterSelect 
                      value={newSecondWaiterName} 
                      onValueChange={setNewSecondWaiterName} 
                      excludeWaiter={newWaiterName}
                      placeholder="Keiner (Einzelschicht)"
                      restaurantId={restaurantId}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{getLabel('pos_sales')}</Label>
                    <CurrencyInput value={newPosSales} onChange={setNewPosSales} />
                  </div>
                  <div>
                    <Label>{getLabel('kassiert_brutto')}</Label>
                    <CurrencyInput value={newKassiertBrutto} onChange={setNewKassiertBrutto} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kartenzahlung (Kredit Karten)</Label>
                    <CurrencyInput value={newCardTotal} onChange={setNewCardTotal} />
                  </div>
                  <div>
                    <Label>{getLabel('hilf_mahl')}</Label>
                    <CurrencyInput value={newHilfMahl} onChange={setNewHilfMahl} />
                  </div>
                </div>

                <div>
                  <Label>{getLabel('open_invoices')}</Label>
                  <CurrencyInput value={newOpenInvoices} onChange={setNewOpenInvoices} />
                </div>

                <div>
                  <Label>{getLabel('cash_handed_in')}</Label>
                  <CurrencyInput value={newCashHandedIn} onChange={setNewCashHandedIn} />
                </div>

                {/* Preview Calculations */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Erwartet (Kassiert + Hilf Mahl - Offen - Kredit Karten):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newKassiertBrutto + newHilfMahl - newOpenInvoices - newCardTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Küchen Trinkgeld (2% vom Umsatz):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newPosSales * 0.02)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trinkgeld:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newCashHandedIn - (newKassiertBrutto + newHilfMahl - newOpenInvoices - newCardTotal) - newPosSales * 0.02)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingShiftId && (
                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      Abbrechen
                    </Button>
                  )}
                  <Button 
                    onClick={handleSaveWaiter} 
                    disabled={!newWaiterName.trim() || createWaiterShift.isPending || updateWaiterShift.isPending} 
                    className="flex-1"
                  >
                    {editingShiftId ? (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Aktualisieren
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Kellner hinzufügen
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Trinkgeld Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Trinkgeld Pool
                </CardTitle>
                <CardDescription>
                  Pool wird gleichmäßig auf alle Kellner verteilt
                </CardDescription>
              </CardHeader>
              <CardContent>
                {waiterShifts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Fügen Sie Kellner hinzu, um den Trinkgeld-Pool zu sehen.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Pool Summary - 4 colored StatCards */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Trinkgeld ohne Küche" value={totalPool} icon={<Users className="w-5 h-5" />} variant={totalPool >= 0 ? 'success' : 'error'} />
                      <StatCard label={`Pro Kellner (${waiterShareCount})`} value={tipPerWaiter} icon={<User className="w-5 h-5" />} variant={tipPerWaiter >= 0 ? 'success' : 'error'} />
                      <StatCard label="Küche" value={totalKitchenTip} icon={<Users className="w-5 h-5" />} variant="success" />
                      <StatCard label="Trinkgeld %" value={`${tipPercentage.toFixed(1)} %`} icon={<Percent className="w-5 h-5" />} variant="success" />
                    </div>

                    {/* Pool Breakdown Table */}
                    <div className="min-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Beitrag</TableHead>
                          <TableHead className="text-right">Anteil</TableHead>
                          <TableHead className="text-right">TG %</TableHead>
                          <TableHead className="text-right">Ø TG %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waiterShifts.map(shift => {
                          const contribution = calculateContribution(shift);
                          const shiftTipShare = shift.participates_in_pool ? tipPerWaiter : 0;
                          // Bei Team-Schichten: persönlicher Umsatzanteil = pos_sales / 2
                          const personalSalesShare = shift.second_waiter_name 
                            ? (shift.pos_sales || 0) / 2 
                            : (shift.pos_sales || 0);
                          const currentTipPercent = personalSalesShare > 0 
                            ? (shiftTipShare / personalSalesShare) * 100 
                            : 0;
                          const avgData = waiterTipAverages[shift.waiter_name];
                          return (
                            <TableRow key={shift.id}>
                              <TableCell className="font-medium">
                                {shift.waiter_name}
                                {shift.second_waiter_name && (
                                  <span className="text-muted-foreground text-xs ml-1">
                                    + {shift.second_waiter_name}
                                  </span>
                                )}
                                {!shift.participates_in_pool && (
                                  <span className="ml-2 text-xs text-muted-foreground">(kein Pool)</span>
                                )}
                              </TableCell>
                              <TableCell className={`text-right tabular-nums ${contribution >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(contribution)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-success">
                                {shift.participates_in_pool ? (
                                  shift.second_waiter_name ? (
                                    <>
                                      {formatCurrency(shiftTipShare)} × 2
                                    </>
                                  ) : (
                                    formatCurrency(shiftTipShare)
                                  )
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {shift.participates_in_pool ? `${currentTipPercent.toFixed(1)}%` : '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {avgData ? `${avgData.avgTipPercent.toFixed(1)}%` : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Waiter List */}
            {waiterShifts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Abgerechnete Kellner</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">{getLabel('pos_sales')}</TableHead>
                          <TableHead className="text-right">{getLabel('kassiert_brutto')}</TableHead>
                          <TableHead className="text-right">Kredit Karten</TableHead>
                          <TableHead className="text-right">{getLabel('hilf_mahl')}</TableHead>
                          <TableHead className="text-right">{getLabel('open_invoices')}</TableHead>
                          <TableHead className="text-right">Abgegeben</TableHead>
                          <TableHead className="text-right">Erwartet</TableHead>
                          <TableHead className="text-right">{getLabel('kitchen_tip')}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waiterShifts.map((shift) => {
                          const expected = calculateExpected(shift);
                          return (
                            <TableRow key={shift.id}>
                              <TableCell className="font-medium">
                                {shift.waiter_name}
                                {shift.second_waiter_name && (
                                  <span className="text-muted-foreground text-sm ml-1">
                                    + {shift.second_waiter_name}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.pos_sales)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.kassiert_brutto)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.card_total)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.hilf_mahl)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.open_invoices)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.cash_handed_in)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(expected)}</TableCell>
                              <TableCell className="text-right tabular-nums text-success">{formatCurrency(shift.kitchen_tip)}</TableCell>
                              <TableCell>
                                {!locked && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditWaiter(shift)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteWaiter(shift.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>}
      </div>
    </AppLayout>;
}
