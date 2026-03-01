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
import { TeamWaiterSelect } from '@/components/shared/TeamWaiterSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSession, useCreateSession, useWaiterShifts, useCreateWaiterShift, useDeleteWaiterShift, useWaiterTipAverages } from '@/hooks/useSession';
import { useUpdateWaiterShiftWithAudit } from '@/hooks/useWaiterShiftAudit';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLabels } from '@/hooks/useLabels';
import { useActiveStaffByRestaurant } from '@/hooks/useStaff';
import type { WaiterShift } from '@/types/database';

export default function WaiterCashUp() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId } = useRestaurant();
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  const locked = isSessionLocked(selectedDate, user?.permissionLevel || 'staff');

  // Form state for new waiter
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newPosSales, setNewPosSales] = useState(0);
  const [newKassiertBrutto, setNewKassiertBrutto] = useState(0);
  const [newCardTotal, setNewCardTotal] = useState(0);
  const [newHilfMahl, setNewHilfMahl] = useState(0);
  const [newOpenInvoices, setNewOpenInvoices] = useState(0);
  const [newCashHandedIn, setNewCashHandedIn] = useState(0);
  const [newAdditionalWaiters, setNewAdditionalWaiters] = useState<string[]>([]);
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
  const { getLabel, isFieldHidden } = useLabels(restaurantId);
  const { data: activeStaff = [] } = useActiveStaffByRestaurant(restaurantId ?? null, 'waiter');

  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId, createdByName: user?.name || undefined });
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
    setNewAdditionalWaiters([]);
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
    setNewAdditionalWaiters(shift.additional_waiters || []);
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

    // Validate: additional waiters cannot include the primary waiter
    if (newAdditionalWaiters.includes(newWaiterName.trim())) {
      toast({
        title: 'Fehler',
        description: 'Ein Teammitglied kann nicht die gleiche Person wie der Hauptmitarbeiter sein.',
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
          second_waiter_name: newAdditionalWaiters.length > 0 ? newAdditionalWaiters[0] : null,
          additional_waiters: newAdditionalWaiters,
          participates_in_pool: newParticipatesInPool,
          pos_sales: newPosSales,
          kassiert_brutto: newKassiertBrutto,
          card_total: newCardTotal,
          hilf_mahl: newHilfMahl,
          open_invoices: newOpenInvoices,
          cash_handed_in: newCashHandedIn
        });
        toast({
          title: 'Mitarbeiter aktualisiert',
          description: `${newWaiterName} wurde aktualisiert.`
        });
      } else {
        // Create new
        await createWaiterShift.mutateAsync({
          session_id: session.id,
          waiter_name: newWaiterName.trim(),
          second_waiter_name: newAdditionalWaiters.length > 0 ? newAdditionalWaiters[0] : null,
          additional_waiters: newAdditionalWaiters,
          participates_in_pool: newParticipatesInPool,
          pos_sales: newPosSales,
          kassiert_brutto: newKassiertBrutto,
          card_total: newCardTotal,
          hilf_mahl: newHilfMahl,
          open_invoices: newOpenInvoices,
          cash_handed_in: newCashHandedIn
        });
        toast({
          title: 'Mitarbeiter hinzugefügt',
          description: `${newWaiterName} wurde hinzugefügt.`
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: editingShiftId ? 'Mitarbeiter konnte nicht aktualisiert werden.' : 'Mitarbeiter konnte nicht hinzugefügt werden.',
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
        title: 'Mitarbeiter gelöscht'
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        variant: 'destructive'
      });
    }
  };
  // Calculate expected cash: pos_sales + hilf_mahl - open_invoices - card_total (matches DB generated column)
  const calculateExpected = (shift: typeof waiterShifts[0]) => {
    return (shift.pos_sales || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
  };

  // Calculate individual contribution to the tip pool
  const calculateContribution = (shift: typeof waiterShifts[0]) => {
    const expected = calculateExpected(shift);
    return shift.cash_handed_in - expected - shift.kitchen_tip;
  };

  // Calculate total tip before kitchen deduction (for TG% display)
  const calculateTotalTipBeforeKitchen = (shift: typeof waiterShifts[0]) => {
    const expected = calculateExpected(shift);
    return (shift.cash_handed_in || 0) - expected;
  };

  // Calculate pool totals (team shifts count as 2 shares, only if participates_in_pool)
  const waiterShareCount = waiterShifts.reduce((count, shift) => {
    if (!shift.participates_in_pool) return count;
    const additionalCount = (shift.additional_waiters?.length || 0);
    return count + 1 + additionalCount;
  }, 0);
  const totalPool = waiterShifts.reduce((sum, shift) => sum + calculateContribution(shift), 0);
  const tipPerWaiter = waiterShareCount > 0 ? totalPool / waiterShareCount : 0;
  const totalKitchenTip = waiterShifts.reduce((sum, shift) => sum + shift.kitchen_tip, 0);
  const totalSales = waiterShifts.reduce((sum, s) => sum + s.pos_sales, 0);
  const totalTip = totalPool + totalKitchenTip;
  const tipPercentage = totalSales > 0 ? totalTip / totalSales * 100 : 0;
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
              Mitarbeiter Abrechnung
            </h1>
            <p className="text-muted-foreground mt-1">
              Tägliche Kassenabrechnung für jeden Mitarbeiter 
            </p>
          </div>
          <DateSelector date={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* No Session State */}
        {!session && <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Noch keine Abrechnung für diesen Tag vorhanden.
              </p>
              <Button onClick={handleCreateSession} disabled={createSession.isPending || !restaurantId}>
                <Plus className="w-4 h-4 mr-2" />
                Neue Abrechnung
              </Button>
            </CardContent>
          </Card>}

        {/* Session Content */}
        {session && <div className="space-y-6">

            {locked && <SessionLockedBanner />}

            <div className="grid lg:grid-cols-2 gap-6">
            {/* Add/Edit Waiter Form */}
            {!locked &&
          <Card className={editingShiftId ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {editingShiftId ?
                  <>
                        <Pencil className="w-5 h-5" />
                        Mitarbeiter bearbeiten: {newWaiterName}
                      </> :

                  <>
                        <User className="w-5 h-5" />
                        Mitarbeiter Name
                      </>
                  }
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mitarbeiter auswählen</Label>
                  <StaffSelect value={newWaiterName} onValueChange={(name) => {
                    setNewWaiterName(name);
                    // Set pool participation default from staff record
                    if (!editingShiftId) {
                      const staffRecord = activeStaff.find(s => s.name === name);
                      if (staffRecord) {
                        setNewParticipatesInPool(staffRecord.participates_in_pool ?? true);
                      }
                    }
                  }} role="waiter" placeholder="Mitarbeiter wählen" excludeNames={waiterShifts.filter((s) => s.id !== editingShiftId).map((s) => s.waiter_name)} restaurantId={restaurantId} />
                  {newWaiterName && (
                    <Badge variant={newParticipatesInPool ? "default" : "secondary"} className="mt-2">
                      {newParticipatesInPool ? "Pool-Mitglied" : "Kein Pool"}
                    </Badge>
                  )}
                </div>

                {newParticipatesInPool &&
              <div>
                    <Label>Team-Mitglieder (optional)</Label>
                    <TeamWaiterSelect
                  value={newAdditionalWaiters}
                  onValueChange={setNewAdditionalWaiters}
                  excludeWaiter={newWaiterName}
                  restaurantId={restaurantId} />

                  </div>
              }

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

                {(!isFieldHidden('card_total_gl') || !isFieldHidden('hilf_mahl')) &&
              <div className="grid grid-cols-2 gap-4">
                  {!isFieldHidden('card_total_gl') &&
                <div>
                    <Label>{getLabel('card_total_gl')}</Label>
                    <CurrencyInput value={newCardTotal} onChange={setNewCardTotal} />
                  </div>
                }
                  {!isFieldHidden('hilf_mahl') &&
                <div>
                    <Label>{getLabel('hilf_mahl')}</Label>
                    <CurrencyInput value={newHilfMahl} onChange={setNewHilfMahl} />
                  </div>
                }
                </div>
              }

                {!isFieldHidden('open_invoices') &&
              <div>
                  <Label>{getLabel('open_invoices')}</Label>
                  <CurrencyInput value={newOpenInvoices} onChange={setNewOpenInvoices} />
                </div>
              }

                <div>
                  <Label>{getLabel('cash_handed_in')}</Label>
                  <CurrencyInput value={newCashHandedIn} onChange={setNewCashHandedIn} />
                </div>

                {/* Preview Calculations */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Erwartet ({getLabel('pos_sales')}
                      {!isFieldHidden('hilf_mahl') ? ` + ${getLabel('hilf_mahl')}` : ''}
                      {!isFieldHidden('open_invoices') ? ` - ${getLabel('open_invoices')}` : ''}
                      {!isFieldHidden('card_total_gl') ? ` - ${getLabel('card_total_gl')}` : ''}):
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(newPosSales + newHilfMahl - newOpenInvoices - newCardTotal)}
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
                      {formatCurrency(newCashHandedIn - (newPosSales + newHilfMahl - newOpenInvoices - newCardTotal) - newPosSales * 0.02)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingShiftId &&
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      Abbrechen
                    </Button>
                }
                  <Button
                  onClick={handleSaveWaiter}
                  disabled={!newWaiterName.trim() || createWaiterShift.isPending || updateWaiterShift.isPending}
                  className="flex-1">

                    {editingShiftId ?
                  <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Aktualisieren
                      </> :

                  <>
                        <Plus className="w-4 h-4 mr-2" />
                        Mitarbeiter hinzufügen
                      </>
                  }
                  </Button>
                </div>
              </CardContent>
            </Card>
          }

            {/* Trinkgeld Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Trinkgeld Pool
                </CardTitle>
                <CardDescription>
                  Pool wird gleichmäßig auf alle Mitarbeiter verteilt
                </CardDescription>
              </CardHeader>
              <CardContent>
                {waiterShifts.length === 0 ?
              <p className="text-muted-foreground text-center py-8">
                    Fügen Sie Mitarbeiter hinzu, um den Trinkgeld-Pool zu sehen.
                  </p> :

              <div className="space-y-4">
                    {/* Pool Summary - 4 colored StatCards */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Trinkgeld ohne Küche" value={totalPool} icon={<Users className="w-5 h-5" />} variant={totalPool >= 0 ? 'success' : 'error'} />
                      <StatCard label="Trinkgeld %" value={`${tipPercentage.toFixed(1)} %`} icon={<Percent className="w-5 h-5" />} variant="success" />
                      <StatCard label={`Pro Mitarbeiter (${waiterShareCount})`} value={tipPerWaiter} icon={<User className="w-5 h-5" />} variant={tipPerWaiter >= 0 ? 'success' : 'error'} className="col-span-2 [&>div]:justify-center [&>div>.flex-1]:text-center [&>div>.flex-1]:flex [&>div>.flex-1]:flex-col [&>div>.flex-1]:items-center" />
                    </div>

                    {/* Pool Breakdown Table */}
                    <div className="min-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Beitrag</TableHead>
                          
                          {isAdmin && <TableHead className="text-right">TG %</TableHead>}
                          {isAdmin && <TableHead className="text-right">Ø TG %</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waiterShifts.flatMap((shift) => {
                        const contribution = calculateContribution(shift);
                        const additionalWaiters = shift.additional_waiters || [];
                        const teamSize = 1 + additionalWaiters.length;
                        const isTeam = teamSize > 1;
                        // TG% = total tip before kitchen / pos_sales (same for all waiters in team shifts)
                        const totalTipBeforeKitchen = calculateTotalTipBeforeKitchen(shift);
                        const posSales = shift.pos_sales || 0;
                        const currentTipPercent = posSales > 0 ? (totalTipBeforeKitchen / posSales) * 100 : 0;
                        const perPersonContribution = contribution / teamSize;

                        // All team members (primary + additional)
                        const allMembers = [shift.waiter_name, ...additionalWaiters];

                        return allMembers.map((name, idx) => {
                          const avgData = waiterTipAverages[name];
                          return (
                          <TableRow key={`${shift.id}-${idx}`}>
                                <TableCell className="font-medium">
                                  {name}
                                  {!shift.participates_in_pool &&
                              <span className="ml-2 text-xs text-muted-foreground">(kein Pool)</span>
                              }
                                </TableCell>
                                <TableCell className={`text-right tabular-nums ${perPersonContribution >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(perPersonContribution)}
                                </TableCell>
                                
                                {isAdmin && <TableCell className="text-right tabular-nums">
                                  {shift.participates_in_pool ? `${currentTipPercent.toFixed(1)}%` : '—'}
                                </TableCell>}
                                {isAdmin && <TableCell className="text-right tabular-nums text-muted-foreground">
                                  {avgData ? `${avgData.avgTipPercent.toFixed(1)}%` : '—'}
                                </TableCell>}
                              </TableRow>);
                        });
                      })}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
              }
              </CardContent>
            </Card>
            </div>

            {/* Waiter List */}
            {waiterShifts.length > 0 &&
        <Card>
                <CardHeader>
                  <CardTitle>Abgerechnete Mitarbeiter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">{getLabel('pos_sales')}</TableHead>
                          <TableHead className="text-right">{getLabel('kassiert_brutto')}</TableHead>
                          {!isFieldHidden('card_total_gl') && <TableHead className="text-right">{getLabel('card_total_gl')}</TableHead>}
                          {!isFieldHidden('hilf_mahl') && <TableHead className="text-right">{getLabel('hilf_mahl')}</TableHead>}
                          {!isFieldHidden('open_invoices') && <TableHead className="text-right">{getLabel('open_invoices')}</TableHead>}
                          
                          <TableHead className="text-right">{getLabel('cash_handed_in')}</TableHead>
                          
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
                                {(shift.additional_waiters?.length > 0) &&
                          <span className="text-muted-foreground text-sm ml-1">
                                    + {shift.additional_waiters.join(', ')}
                                  </span>
                          }
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.pos_sales)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.kassiert_brutto)}</TableCell>
                              {!isFieldHidden('card_total_gl') && <TableCell className="text-right tabular-nums">{formatCurrency(shift.card_total)}</TableCell>}
                              {!isFieldHidden('hilf_mahl') && <TableCell className="text-right tabular-nums">{formatCurrency(shift.hilf_mahl)}</TableCell>}
                              {!isFieldHidden('open_invoices') && <TableCell className="text-right tabular-nums">{formatCurrency(shift.open_invoices)}</TableCell>}
                              
                              <TableCell className="text-right tabular-nums">{formatCurrency(shift.cash_handed_in)}</TableCell>
                              
                              <TableCell>
                                {!locked &&
                          <div className="flex gap-1">
                                  <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditWaiter(shift)}>

                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteWaiter(shift.id)}>

                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                          }
                              </TableCell>
                            </TableRow>);

                  })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
        }
          </div>}
      </div>
    </AppLayout>;
}