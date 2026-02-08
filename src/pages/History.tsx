import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History as HistoryIcon, Calendar, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelectedDate } from '@/contexts/DateContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSessionHistory, useDeleteAllSessions } from '@/hooks/useSession';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { AuditLogList } from '@/components/audit/AuditLogList';

export default function History() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurantId, restaurantSlug } = useRestaurant();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [selectedMonth, setSelectedMonth] = useState(selectedDate);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { data: sessions = [], isLoading } = useSessionHistory(restaurantId);
  const deleteAllSessions = useDeleteAllSessions(restaurantId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleViewSession = (date: string) => {
    const parsedDate = new Date(date);
    setSelectedDate(parsedDate);
    navigate(`/${restaurantSlug}/summary`);
  };

  // Calculate quick stats
  const totalSessions = sessions.length;
  const finalizedSessions = sessions.filter(s => s.is_finalized).length;

  const isConfirmValid = confirmText.toLowerCase() === 'löschen';

  const handleDeleteAll = async () => {
    try {
      await deleteAllSessions.mutateAsync();
      setDeleteDialogOpen(false);
      setConfirmText('');
      toast({
        title: 'Erfolgreich gelöscht',
        description: `${totalSessions} Sessions wurden unwiderruflich gelöscht.`,
      });
    } catch (error) {
      toast({
        title: 'Fehler beim Löschen',
        description: 'Die Sessions konnten nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
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
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <HistoryIcon className="w-8 h-8" />
              Verlauf
            </h1>
            <p className="text-muted-foreground mt-1">
              Vergangene Tagesabrechnungen durchsuchen
            </p>
          </div>

          {totalSessions > 0 && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setConfirmText('');
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Alle löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Sessions löschen?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      ⚠️ Diese Aktion kann nicht rückgängig gemacht werden! Es werden{' '}
                      <strong>{totalSessions} Sessions</strong> unwiderruflich gelöscht.
                    </p>
                    <p>
                      Tippe <strong>"LÖSCHEN"</strong> ein, um zu bestätigen:
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="LÖSCHEN"
                      className="mt-2"
                      autoComplete="off"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={!isConfirmValid || deleteAllSessions.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAllSessions.isPending ? 'Löschen...' : 'Endgültig löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamt Sessions</p>
                  <p className="text-2xl font-display font-semibold">{totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Abgeschlossen</p>
                  <p className="text-2xl font-display font-semibold">{finalizedSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={(date) => {
                  if (date) {
                    handleViewSession(format(date, 'yyyy-MM-dd'));
                  }
                }}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                locale={de}
                className="pointer-events-auto"
                modifiers={{
                  hasSession: sessions.map(s => new Date(s.session_date)),
                }}
                modifiersClassNames={{
                  hasSession: 'bg-primary/20 text-primary font-semibold rounded-full',
                }}
              />
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Letzte Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Sessions vorhanden.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">POS Total</TableHead>
                         <TableHead className="text-right">Kredit Karten Terminal 1</TableHead>
                         <TableHead className="text-right">Kredit Karten Terminal 2</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {format(new Date(session.session_date), "EEEE, d. MMM yyyy", { locale: de })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(session.pos_total || 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(session.terminal_1_total || 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(session.terminal_2_total || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {session.is_finalized ? (
                              <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Abgeschlossen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <XCircle className="w-3.5 h-3.5" />
                                Offene Rechnung
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSession(session.session_date)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ansehen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Section */}
        <AuditLogList />
      </div>
    </AppLayout>
  );
}
