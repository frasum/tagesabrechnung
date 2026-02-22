import { useState } from 'react';
import { format } from 'date-fns';
import { useSelectedDate } from '@/contexts/DateContext';
import { useAuth } from '@/contexts/AuthContext';
import { isSessionLocked } from '@/utils/businessDate';
import { SessionLockedBanner } from '@/components/shared/SessionLockedBanner';
import { Plus, Trash2, ChefHat, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DateSelector } from '@/components/shared/DateSelector';
import { StatCard } from '@/components/shared/StatCard';
import { StaffSelect } from '@/components/shared/StaffSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRestaurant } from '@/hooks/useRestaurant';
import {
  useSession,
  useCreateSession,
  useWaiterShifts,
  useKitchenShifts,
  useCreateKitchenShift,
  useDeleteKitchenShift,
} from '@/hooks/useSession';
import { MonthlyKitchenTipCard } from '@/components/kitchen/MonthlyKitchenTipCard';

export default function KitchenTipSplit() {
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { restaurantId } = useRestaurant();
  const { user } = useAuth();
  const locked = isSessionLocked(selectedDate, user?.permissionLevel || 'staff');

  // Form state
  const [staffName, setStaffName] = useState('');
  const [shiftStart, setShiftStart] = useState('15:00');
  const [shiftEnd, setShiftEnd] = useState('23:30');

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(selectedDate, restaurantId);
  const createSession = useCreateSession();
  const { data: waiterShifts = [] } = useWaiterShifts(session?.id);
  const { data: kitchenShifts = [] } = useKitchenShifts(session?.id);
  const createKitchenShift = useCreateKitchenShift();
  const deleteKitchenShift = useDeleteKitchenShift();

  // Calculate total kitchen tip (2% of all POS sales)
  const totalKitchenTip = waiterShifts.reduce((sum, shift) => sum + shift.kitchen_tip, 0);
  
  // Calculate total hours worked
  const totalHours = kitchenShifts.reduce((sum, shift) => sum + shift.hours_worked, 0);

  // Calculate tip per hour
  const tipPerHour = totalHours > 0 ? totalKitchenTip / totalHours : 0;

  const handleCreateSession = async () => {
    if (!restaurantId) return;
    try {
      await createSession.mutateAsync({ date: selectedDate, restaurantId, createdByName: user?.name || undefined });
      toast({ title: 'Session erstellt', description: `Session für ${format(selectedDate, 'dd.MM.yyyy')} wurde erstellt.` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' });
    }
  };

  const handleAddKitchenStaff = async () => {
    if (!session?.id || !staffName.trim()) {
      toast({ title: 'Fehler', description: 'Bitte Namen eingeben.', variant: 'destructive' });
      return;
    }

    try {
      await createKitchenShift.mutateAsync({
        session_id: session.id,
        staff_name: staffName.trim(),
        shift_start: shiftStart,
        shift_end: shiftEnd,
      });

      setStaffName('');
      toast({ title: 'Küchenmitarbeiter hinzugefügt' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const handleDeleteKitchenStaff = async (id: string) => {
    if (!session?.id) return;
    try {
      await deleteKitchenShift.mutateAsync({ id, sessionId: session.id });
      toast({ title: 'Mitarbeiter gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} Std.`;
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
              Küchen Trinkgeld
            </h1>
            <p className="text-muted-foreground mt-1">
              Trinkgeldverteilung nach Arbeitsstunden
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
              <Button onClick={handleCreateSession} disabled={createSession.isPending || !restaurantId}>
                <Plus className="w-4 h-4 mr-2" />
                Neue Abrechnung
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Session Content */}
        {session && (
          <div className="space-y-6">
            {locked && <SessionLockedBanner />}

            {/* Summary Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard
                label="Küchen Trinkgeld Pool"
                value={totalKitchenTip}
                icon={<ChefHat className="w-5 h-5" />}
                variant="success"
              />
              <StatCard
                label="Gesamte Arbeitsstunden"
                value={formatHours(totalHours)}
                icon={<Clock className="w-5 h-5" />}
              />
              <StatCard
                label="Trinkgeld pro Stunde"
                value={tipPerHour}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Add Kitchen Staff Form */}
              {!locked && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    Mitarbeiter hinzufügen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Küchenmitarbeiter auswählen</Label>
                    <StaffSelect
                      value={staffName}
                      onValueChange={setStaffName}
                      role="kitchen"
                      placeholder="Mitarbeiter wählen"
                      excludeNames={kitchenShifts.map((s) => s.staff_name)}
                      restaurantId={restaurantId}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shiftStart">Schichtbeginn</Label>
                      <Input
                        id="shiftStart"
                        type="time"
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shiftEnd">Schichtende</Label>
                      <Input
                        id="shiftEnd"
                        type="time"
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddKitchenStaff}
                    disabled={!staffName.trim() || createKitchenShift.isPending}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </CardContent>
              </Card>
              )}

              {/* Kitchen Staff Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Küchenpersonal Übersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  {kitchenShifts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Noch kein Küchenpersonal für diesen Tag hinzugefügt.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-center">Beginn</TableHead>
                            <TableHead className="text-center">Ende</TableHead>
                            <TableHead className="text-right">Stunden</TableHead>
                            <TableHead className="text-right">Anteil %</TableHead>
                            <TableHead className="text-right">Trinkgeld</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kitchenShifts.map((shift) => {
                            const percentage = totalHours > 0 ? (shift.hours_worked / totalHours) * 100 : 0;
                            const tipAmount = totalHours > 0 ? (shift.hours_worked / totalHours) * totalKitchenTip : 0;

                            return (
                              <TableRow key={shift.id}>
                                <TableCell className="font-medium">{shift.staff_name}</TableCell>
                                <TableCell className="text-center">{shift.shift_start.slice(0, 5)}</TableCell>
                                <TableCell className="text-center">{shift.shift_end.slice(0, 5)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatHours(shift.hours_worked)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {percentage.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-medium text-success">
                                  {formatCurrency(tipAmount)}
                                </TableCell>
                                <TableCell>
                                  {!locked && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteKitchenStaff(shift.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Totals */}
                      <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <span className="font-medium">Gesamt:</span>
                        <div className="flex gap-8">
                          <span className="tabular-nums">{formatHours(totalHours)}</span>
                          <span className="tabular-nums">100%</span>
                          <span className="tabular-nums font-semibold text-success">
                            {formatCurrency(totalKitchenTip)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Overview Card */}
            {user?.permissionLevel === 'admin' && <MonthlyKitchenTipCard />}

            {/* Info Box */}
            {waiterShifts.length === 0 && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground">
                    <strong>Hinweis:</strong> Der Küchen-Trinkgeld-Pool wird aus den Kellner-Abrechnungen berechnet (2% des POS-Umsatzes).
                    Fügen Sie zuerst Kellner-Schichten hinzu.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
