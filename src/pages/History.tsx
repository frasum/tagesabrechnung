import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History as HistoryIcon, Calendar, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelectedDate } from '@/contexts/DateContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
'@/components/ui/alert-dialog';
import { useSessionHistory, useDeleteAllSessions } from '@/hooks/useSession';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { AuditLogList } from '@/components/audit/AuditLogList';
import { useCashBalanceData } from '@/hooks/useCashBalanceData';

export default function History() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurantId, restaurantSlug } = useRestaurant();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [selectedMonth, setSelectedMonth] = useState(selectedDate);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [page, setPage] = useState(0);
  const { data, isLoading } = useSessionHistory(restaurantId, page);
  const sessions = data?.sessions ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / 30);
  const deleteAllSessions = useDeleteAllSessions(restaurantId);
  const { data: cashRows = [] } = useCashBalanceData(restaurantId);

  const cashByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of cashRows) {
      map.set(row.date, row.rawBargeld);
    }
    return map;
  }, [cashRows]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleViewSession = (date: string) => {
    const parsedDate = new Date(date);
    setSelectedDate(parsedDate);
    navigate(`/${restaurantSlug}/summary`);
  };

  const totalSessions = totalCount;

  const isConfirmValid = confirmText.toLowerCase() === 'löschen';

  const handleDeleteAll = async () => {
    try {
      await deleteAllSessions.mutateAsync();
      setDeleteDialogOpen(false);
      setConfirmText('');
      toast({
        title: 'Erfolgreich gelöscht',
        description: `${totalSessions} Sessions wurden unwiderruflich gelöscht.`
      });
    } catch (error) {
      toast({
        title: 'Fehler beim Löschen',
        description: 'Die Sessions konnten nicht gelöscht werden.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Laden...</div>
        </div>
      </AppLayout>);

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

          {totalSessions > 0 &&
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
                    autoComplete="off" />

                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                  onClick={handleDeleteAll}
                  disabled={!isConfirmValid || deleteAllSessions.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

                    {deleteAllSessions.isPending ? 'Löschen...' : 'Endgültig löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Anzahl der Abrechnungen </p>
                  <p className="text-2xl font-display font-semibold">{totalSessions}</p>
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
                  hasSession: sessions.map((s) => new Date(s.session_date))
                }}
                modifiersClassNames={{
                  hasSession: 'bg-primary/20 text-primary font-semibold rounded-full'
                }} />

            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Letzte Abrechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ?
              <p className="text-muted-foreground text-center py-8">
                  Noch keine Sessions vorhanden.
                </p> :

              <>
              <div className="relative">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin" id="history-scroll">
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden z-10" />
                  <Table className="table-fixed min-w-[870px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Datum</TableHead>
                        <TableHead className="w-[120px] text-right">POS Total</TableHead>
                        <TableHead className="w-[150px] text-right">Kreditkarten (%)</TableHead>
                        <TableHead className="w-[150px] text-right">Take Away (%)</TableHead>
                        <TableHead className="w-[130px] text-right">Gäste / Ø Verzehr</TableHead>
                        <TableHead className="w-[110px] text-right">Tages-Bargeld</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) =>
                    <TableRow key={session.id}>
                          <TableCell className="font-medium py-2">
                            {format(new Date(session.session_date), "EEEE, d. MMM", { locale: de })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums py-2">
                            {formatCurrency(session.pos_total || 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums py-2">
                            {(() => {
                          const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
                          const posTotal = session.pos_total || 0;
                          const pct = posTotal > 0 ? (kreditkarten / posTotal * 100).toFixed(1) : '0.0';
                          return <div><div>{formatCurrency(kreditkarten)}</div><div className="text-muted-foreground text-xs">({pct}%)</div></div>;
                        })()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums py-2">
                            {(() => {
                          const takeaway = (session.takeaway_total || 0) + (session.ordersmart_revenue || 0) + (session.wolt_revenue || 0);
                          const posTotal = session.pos_total || 0;
                          const pct = posTotal > 0 ? (takeaway / posTotal * 100).toFixed(1) : '0.0';
                          return <div><div>{formatCurrency(takeaway)}</div><div className="text-muted-foreground text-xs">({pct}%)</div></div>;
                        })()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums py-2">
                            {(() => {
                          const guestCount = session.guest_count || 0;
                          if (guestCount === 0) return <span className="text-muted-foreground">–</span>;
                          const takeaway = (session.takeaway_total || 0) + (session.ordersmart_revenue || 0) + (session.wolt_revenue || 0);
                          const avg = ((session.pos_total || 0) - takeaway) / guestCount;
                          return (
                            <div>
                                  <div>{guestCount}</div>
                                  <div className="text-xs text-muted-foreground">Ø {formatCurrency(avg)}</div>
                                </div>);

                        })()}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums font-medium py-2 ${(cashByDate.get(session.session_date) ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(cashByDate.get(session.session_date) ?? 0)}
                          </TableCell>
                          <TableCell>
                            <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewSession(session.session_date)}
                          title="Ansehen">

                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
                </div>
                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => {
                        if (totalPages <= 7 || i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
                          return (
                            <PaginationItem key={i}>
                              <PaginationLink
                                isActive={i === page}
                                onClick={() => setPage(i)}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (i === 1 && page > 3) return <PaginationItem key={i}><PaginationEllipsis /></PaginationItem>;
                        if (i === totalPages - 2 && page < totalPages - 4) return <PaginationItem key={i}><PaginationEllipsis /></PaginationItem>;
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          className={page === totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
              }
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Section */}
        <AuditLogList />
      </div>
    </AppLayout>);

}