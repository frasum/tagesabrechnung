import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Landmark, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { BankDeposit } from '@/hooks/useBankDeposits';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

interface BankDepositListProps {
  deposits: BankDeposit[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function BankDepositList({ deposits, onDelete, isDeleting = false }: BankDepositListProps) {
  if (deposits.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Bankeinzahlungen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Notiz</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell className="font-medium">
                  {format(parseISO(deposit.deposit_date), 'dd.MM.yyyy', { locale: de })}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-destructive">
                  -{formatCurrency(deposit.amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {deposit.notes || '-'}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Einzahlung löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchtest du die Bankeinzahlung vom {format(parseISO(deposit.deposit_date), 'dd.MM.yyyy', { locale: de })} über {formatCurrency(deposit.amount)} wirklich löschen?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(deposit.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
