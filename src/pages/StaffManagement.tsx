import { useState, useEffect } from 'react';
import { Users, Plus, ChefHat, UtensilsCrossed, Search, Trophy, ChevronDown } from 'lucide-react';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffCard } from '@/components/staff/StaffCard';
import { StaffDialog } from '@/components/staff/StaffDialogNative';
import { TipRanking, RankingItem } from '@/components/waiter/TipRanking';

import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, hasRole, Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useShowTipRanking } from '@/hooks/useSettings';
import { useWaiterRanking } from '@/hooks/useWaiterRanking';
import { useRestaurants } from '@/hooks/useRestaurant';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StaffManagement() {
  const [filter, setFilter] = useState<StaffRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [selectedRankingRestaurantId, setSelectedRankingRestaurantId] = useState<string | null>(null);

  const { data: restaurants = [] } = useRestaurants();
  const restaurantId = selectedRankingRestaurantId;
  const { showTipRanking, updateShowTipRanking, isUpdating: isUpdatingRanking } = useShowTipRanking(restaurantId);

  const { data: allStaff = [], isLoading } = useStaff(undefined, { includeLinkedProfiles: true });
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();
  const { data: rankings = [], isLoading: rankingsLoading } = useWaiterRanking();

  // Create a map of waiter name -> ranking data for quick lookup
  const rankingMap = new Map(rankings.map(r => [r.name.toLowerCase(), r]));
  const filteredStaff = allStaff.filter(s => {
    const matchesRole = filter === 'all' || hasRole(s.role, filter as 'waiter' | 'kitchen' | 'gl');
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Group staff by restaurant, then by role
  const groupedByRestaurant = (() => {
    // Collect all restaurants from staff assignments
    const restaurantMap = new Map<string, { id: string; name: string; waiters: Staff[]; kitchen: Staff[] }>();
    const noRestaurant: { waiters: Staff[]; kitchen: Staff[] } = { waiters: [], kitchen: [] };

    const addToGroup = (group: { waiters: Staff[]; kitchen: Staff[] }, staff: Staff) => {
      if (hasRole(staff.role, 'waiter')) {
        if (!group.waiters.find(s => s.id === staff.id)) group.waiters.push(staff);
      }
      if (hasRole(staff.role, 'kitchen')) {
        if (!group.kitchen.find(s => s.id === staff.id)) group.kitchen.push(staff);
      }
    };

    for (const staff of filteredStaff) {
      const restaurants = staff.staff_restaurants ?? [];
      if (restaurants.length === 0) {
        addToGroup(noRestaurant, staff);
      } else {
        for (const sr of restaurants) {
          const r = sr.restaurants;
          if (!restaurantMap.has(r.id)) {
            restaurantMap.set(r.id, { id: r.id, name: r.name, waiters: [], kitchen: [] });
          }
          addToGroup(restaurantMap.get(r.id)!, staff);
        }
      }
    }

    // Sort within each group
    const sortGroup = (g: { waiters: Staff[]; kitchen: Staff[] }) => {
      g.waiters.sort((a, b) => a.name.localeCompare(b.name));
      g.kitchen.sort((a, b) => a.name.localeCompare(b.name));
    };

    const result = Array.from(restaurantMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    result.forEach(sortGroup);
    sortGroup(noRestaurant);

    return { restaurants: result, noRestaurant };
  })();

  const waiterCount = allStaff.filter(s => hasRole(s.role, 'waiter')).length;
  const kitchenCount = allStaff.filter(s => hasRole(s.role, 'kitchen')).length;

  // Auto-select first restaurant for ranking toggle
  useEffect(() => {
    if (!selectedRankingRestaurantId && restaurants.length > 0) {
      setSelectedRankingRestaurantId(restaurants[0].id);
    }
  }, [restaurants, selectedRankingRestaurantId]);

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
              Mitarbeiter und Küchenpersonal verwalten
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
                Service ({waiterCount})
              </TabsTrigger>
              <TabsTrigger value="kitchen" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Küche ({kitchenCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tip Ranking Toggle */}
        {restaurants.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border p-4 bg-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary shrink-0" />
                <Label htmlFor="tip-ranking-toggle" className="cursor-pointer text-sm font-medium">
                  Trinkgeld Ranking für Mitarbeiter anzeigen
                </Label>
              </div>
              <Switch
                id="tip-ranking-toggle"
                checked={showTipRanking}
                disabled={isUpdatingRanking || !restaurantId}
                onCheckedChange={(checked) => {
                  if (restaurantId) {
                    updateShowTipRanking({ enabled: checked, restaurantId });
                  }
                }}
              />
            </div>
            <Select
              value={selectedRankingRestaurantId ?? undefined}
              onValueChange={setSelectedRankingRestaurantId}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Restaurant wählen…" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
          <div className="space-y-8">
            {groupedByRestaurant.restaurants.map(group => (
              <div key={group.id} className="space-y-4">
                <h2 className="text-xl font-bold text-foreground border-b pb-2">{group.name}</h2>
                
                {group.waiters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                      Service ({group.waiters.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.waiters.map(staff => (
                        <StaffCard key={staff.id} staff={staff} onEdit={handleEdit} onDelete={setDeleteStaff} rankingData={rankingMap.get(staff.name.toLowerCase())} />
                      ))}
                    </div>
                  </div>
                )}

                {group.kitchen.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-primary" />
                      Küche ({group.kitchen.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.kitchen.map(staff => (
                        <StaffCard key={staff.id} staff={staff} onEdit={handleEdit} onDelete={setDeleteStaff} rankingData={rankingMap.get(staff.name.toLowerCase())} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Staff without restaurant */}
            {(groupedByRestaurant.noRestaurant.waiters.length > 0 || groupedByRestaurant.noRestaurant.kitchen.length > 0) && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Ohne Restaurant</h2>
                {groupedByRestaurant.noRestaurant.waiters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                      Service ({groupedByRestaurant.noRestaurant.waiters.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupedByRestaurant.noRestaurant.waiters.map(staff => (
                        <StaffCard key={staff.id} staff={staff} onEdit={handleEdit} onDelete={setDeleteStaff} rankingData={rankingMap.get(staff.name.toLowerCase())} />
                      ))}
                    </div>
                  </div>
                )}
                {groupedByRestaurant.noRestaurant.kitchen.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-primary" />
                      Küche ({groupedByRestaurant.noRestaurant.kitchen.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupedByRestaurant.noRestaurant.kitchen.map(staff => (
                        <StaffCard key={staff.id} staff={staff} onEdit={handleEdit} onDelete={setDeleteStaff} rankingData={rankingMap.get(staff.name.toLowerCase())} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Ranking Table */}
        {rankings.length > 0 && (
          <Collapsible open={rankingOpen} onOpenChange={setRankingOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Trinkgeld Ranking ({rankings.length} Mitarbeiter)
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${rankingOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <TipRanking
                rankings={rankings.map(r => ({
                  name: r.name,
                  avgTipPercent: r.avgTipPercent,
                  trend: r.trend,
                  trendValue: r.trendValue,
                  rank: r.rank,
                }))}
                currentUserName=""
                isLoading={rankingsLoading}
              />
            </CollapsibleContent>
          </Collapsible>
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
