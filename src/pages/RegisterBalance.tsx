import { useState } from 'react';
import { Vault, Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransferDialog } from '@/components/register/TransferDialog';
import { TransferList } from '@/components/register/TransferList';
import { useRegisterTransfers } from '@/hooks/useRegisterTransfers';
import { useRestaurant } from '@/hooks/useRestaurant';
import { toast } from 'sonner';

export default function RegisterBalance() {
  const { restaurantId } = useRestaurant();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const {
    transfers,
    balances,
    isLoading,
    createTransfer,
    isCreating,
    deleteTransfer,
    isDeleting,
  } = useRegisterTransfers(restaurantId);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleCreateTransfer = (data: Parameters<typeof createTransfer>[0]) => {
    createTransfer(data, {
      onSuccess: () => {
        toast.success('Transfer erfasst');
        setDialogOpen(false);
      },
      onError: (error) => {
        toast.error('Fehler beim Speichern: ' + error.message);
      },
    });
  };

  const handleDeleteTransfer = (id: string) => {
    deleteTransfer(id, {
      onSuccess: () => toast.success('Transfer gelöscht'),
      onError: (error) => toast.error('Fehler beim Löschen: ' + error.message),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Vault className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tresor</h1>
              <p className="text-muted-foreground">Einzahlungen und Auszahlungen</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Neu
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-green-600" />
                Einzahlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(balances.totalToSafe)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                Auszahlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(balances.totalToRestaurant)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(balances.totalToSafe - balances.totalToRestaurant)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Table */}
        <Card>
          <CardContent className="pt-6">
            <TransferList
              transfers={transfers}
              onDelete={handleDeleteTransfer}
              isDeleting={isDeleting}
            />
          </CardContent>
        </Card>
      </div>

      <TransferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateTransfer}
        restaurantId={restaurantId || ''}
        isPending={isCreating}
      />
    </AppLayout>
  );
}
