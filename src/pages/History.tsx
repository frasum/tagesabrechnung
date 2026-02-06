import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History as HistoryIcon, Calendar, Euro, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useSessionHistory } from '@/hooks/useSession';

export default function History() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { data: sessions = [], isLoading } = useSessionHistory();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleViewSession = (date: string) => {
    const parsedDate = new Date(date);
    navigate(`/summary?date=${format(parsedDate, 'yyyy-MM-dd')}`);
  };

  // Calculate quick stats
  const totalSessions = sessions.length;
  const finalizedSessions = sessions.filter(s => s.is_finalized).length;

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
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <HistoryIcon className="w-8 h-8" />
            Verlauf
          </h1>
          <p className="text-muted-foreground mt-1">
            Vergangene Tagesabrechnungen durchsuchen
          </p>
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
                        <TableHead className="text-right">Terminal 1</TableHead>
                        <TableHead className="text-right">Terminal 2</TableHead>
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
                                Offen
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
      </div>
    </AppLayout>
  );
}
