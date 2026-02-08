import { useState } from 'react';
import { Users, Plus, ChefHat, UtensilsCrossed, Search } from 'lucide-react';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StaffCard } from '@/components/staff/StaffCard';
import { StaffDialog } from '@/components/staff/StaffDialog';
import { WaiterQRCode } from '@/components/manager/WaiterQRCode';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, Staff, StaffInput, StaffRole } from '@/hooks/useStaff';

export default function StaffManagement() {
  const [filter, setFilter] = useState<StaffRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);

  const { data: allStaff = [], isLoading } = useStaff();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();

  // Filter staff by role and search query
  const filteredStaff = allStaff.filter(s => {
    const matchesRole = filter === 'all' || s.role === filter;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const waiterCount = allStaff.filter(s => s.role === 'waiter').length;
  const kitchenCount = allStaff.filter(s => s.role === 'kitchen').length;

  const handleOpenNew = () => {
    setEditingStaff(null);
    setDialogOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setDialogOpen(true);
  };

  const handleSave = (data: StaffInput) => {
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, ...data }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteStaff) {
      deleteMutation.mutate(deleteStaff.id, {
        onSuccess: () => setDeleteStaff(null),
      });
    }
  };

  if (isLoading) {
    return (
      <GlobalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Mitarbeiter werden geladen...</div>
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Mitarbeiterverwaltung
            </h1>
            <p className="text-muted-foreground mt-1">
              Kellner und Küchenpersonal verwalten
            </p>
          </div>
          
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Neuer Mitarbeiter
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Users className="w-4 h-4" />
                Alle ({allStaff.length})
              </TabsTrigger>
              <TabsTrigger value="waiter" className="gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Kellner ({waiterCount})
              </TabsTrigger>
              <TabsTrigger value="kitchen" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Küche ({kitchenCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* QR Code for Waiter Self-Service */}
        <WaiterQRCode />

        {/* Staff List */}
        {filteredStaff.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Keine Mitarbeiter gefunden.'
                  : 'Noch keine Mitarbeiter angelegt.'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Klicken Sie auf "Neuer Mitarbeiter", um einen hinzuzufügen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map(staff => (
              <StaffCard
                key={staff.id}
                staff={staff}
                onEdit={handleEdit}
                onDelete={setDeleteStaff}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={editingStaff}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStaff} onOpenChange={() => setDeleteStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitarbeiter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie "{deleteStaff?.name}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Löschen...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlobalLayout>
  );
}
