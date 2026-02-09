import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { RegisterTransfer } from '@/hooks/useRegisterTransfers';

interface TransferListProps {
  transfers: RegisterTransfer[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

export function TransferList({ transfers, onDelete, isDeleting }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Noch keine Transfers erfasst.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Einzahlung</TableHead>
          <TableHead className="text-right">Auszahlung</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transfers.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="whitespace-nowrap">
              {format(parseISO(t.transfer_date), 'dd.MM.yyyy', { locale: de })}
            </TableCell>
            <TableCell>{t.created_by_name || '–'}</TableCell>
            <TableCell className="text-right text-green-600 font-medium">
              {t.direction === 'to_safe' ? formatCurrency(t.amount) : ''}
            </TableCell>
            <TableCell className="text-right text-red-600 font-medium">
              {t.direction === 'to_restaurant' ? formatCurrency(t.amount) : ''}
            </TableCell>
            <TableCell>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Transfer löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Möchtest du diesen Transfer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(t.id)}
                      disabled={isDeleting}
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
  );
}
