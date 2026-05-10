import { useState, useEffect } from 'react';
import { Users, ChefHat, UtensilsCrossed, Search, Trophy, ChevronDown, UserPlus, Eye, EyeOff, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportStaffToCsv } from '@/utils/staffCsvExport';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffDialog } from '@/components/staff/StaffDialogNative';
import { TipRanking } from '@/components/waiter/TipRanking';
import { StaffMatrixView } from '@/components/staff/StaffMatrixView';
import { cn } from '@/lib/utils';

import { useStaff, useCreateStaff, useUpdateStaff, useDeactivateStaff, useReactivateStaff, hasRole, Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useShowTipRanking } from '@/hooks/useSettings';
import { useWaiterRanking } from '@/hooks/useWaiterRanking';
import { useRestaurants } from '@/hooks/useRestaurant';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterTab = 'all' | 'waiter' | 'kitchen';

const filterTabs: { value: FilterTab; label: string; icon: typeof Users }[] = [
  { value: 'all', label: 'Alle', icon: Users },
  { value: 'waiter', label: 'Service', icon: UtensilsCrossed },
  { value: 'kitchen', label: 'Küche', icon: ChefHat },
];

export default function StaffManagement() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
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
  const deactivateMutation = useDeactivateStaff();
  const reactivateMutation = useReactivateStaff();
  const { data: rankings = [], isLoading: rankingsLoading } = useWaiterRanking();

  const rankingMap = new Map(rankings.map(r => [r.name.toLowerCase(), r]));
  const activeStaff = allStaff.filter(s => s.is_active !== false);
  const inactiveStaff = allStaff.filter(s => s.is_active === false);
  const displayStaff = showInactive ? allStaff : activeStaff;
  
  const filteredStaff = displayStaff
    .filter(s => {
      const matchesRole = filter === 'all' || hasRole(s.role, filter as 'waiter' | 'kitchen');
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const waiterCount = activeStaff.filter(s => hasRole(s.role, 'waiter')).length;
  const kitchenCount = activeStaff.filter(s => hasRole(s.role, 'kitchen')).length;
  const counts: Record<FilterTab, number> = { all: activeStaff.length, waiter: waiterCount, kitchen: kitchenCount };

  useEffect(() => {
    if (!selectedRankingRestaurantId && restaurants.length > 0) {
      setSelectedRankingRestaurantId(restaurants[0].id);
    }
  }, [restaurants, selectedRankingRestaurantId]);

  const handleOpenNew = () => { setEditingStaff(null); setDialogOpen(true); };
  const handleEdit = (staff: Staff) => { setEditingStaff(staff); setDialogOpen(true); };

  const handleSave = (data: StaffInput) => {
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleConfirmDeactivate = () => {
    if (deleteStaff) {
      deactivateMutation.mutate(deleteStaff.id, { onSuccess: () => setDeleteStaff(null) });
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
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                Mitarbeiterverwaltung
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {activeStaff.length} Mitarbeiter · {waiterCount} Service · {kitchenCount} Küche
                {inactiveStaff.length > 0 && <span className="text-muted-foreground/60"> · {inactiveStaff.length} inaktiv</span>}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (filteredStaff.length === 0) {
                    toast.error('Keine Mitarbeiter zum Exportieren');
                    return;
                  }
                  try {
                    exportStaffToCsv(filteredStaff);
                    toast.success(`${filteredStaff.length} Mitarbeiter exportiert`);
                  } catch (e) {
                    toast.error('Export fehlgeschlagen');
                  }
                }}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                CSV Export
              </Button>
              <Button onClick={handleOpenNew} size="lg" className="gap-2 shadow-md">
                <UserPlus className="w-4 h-4" />
                Neuer Mitarbeiter
              </Button>
            </div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          
          <div className="flex rounded-lg border bg-card p-1 gap-0.5">
            {filterTabs.map(tab => {
              const isActive = filter === tab.value;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-xs tabular-nums ml-0.5",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {counts[tab.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {inactiveStaff.length > 0 && (
            <Button
              variant={showInactive ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showInactive ? 'Inaktive ausblenden' : 'Inaktive anzeigen'}</span>
              <span className="sm:hidden">{inactiveStaff.length}</span>
            </Button>
          )}
        </div>

        {/* Tip Ranking Toggle */}
        {restaurants.length > 0 && (
          <Card className="border-primary/10 bg-gradient-to-r from-card to-primary/[0.02]">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="tip-ranking-toggle" className="cursor-pointer text-sm font-medium">
                    Trinkgeld Ranking anzeigen
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Für Mitarbeiter im Waiter-Bereich sichtbar</p>
                </div>
                <Switch
                  id="tip-ranking-toggle"
                  checked={showTipRanking}
                  disabled={isUpdatingRanking || !restaurantId}
                  onCheckedChange={(checked) => {
                    if (restaurantId) updateShowTipRanking({ enabled: checked, restaurantId });
                  }}
                />
              </div>
              <Select
                value={selectedRankingRestaurantId ?? undefined}
                onValueChange={setSelectedRankingRestaurantId}
              >
                <SelectTrigger className="w-full sm:w-48 bg-card">
                  <SelectValue placeholder="Restaurant…" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Staff Matrix */}
        {filteredStaff.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {searchQuery ? 'Keine Mitarbeiter gefunden.' : 'Noch keine Mitarbeiter angelegt.'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Klicke auf "Neuer Mitarbeiter", um einen hinzuzufügen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <StaffMatrixView
            staff={filteredStaff}
            restaurants={restaurants}
            onEdit={handleEdit}
            onDelete={setDeleteStaff}
            onReactivate={(s) => reactivateMutation.mutate(s.id)}
          />
        )}

        {/* Collapsible Ranking Table */}
        {rankings.length > 0 && (
          <Collapsible open={rankingOpen} onOpenChange={setRankingOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2 h-12 bg-card">
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" />
                  <span className="font-medium">Trinkgeld Ranking</span>
                  <span className="text-xs text-muted-foreground">({rankings.length} Mitarbeiter)</span>
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", rankingOpen && 'rotate-180')} />
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

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={editingStaff}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteStaff} onOpenChange={() => setDeleteStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitarbeiter deaktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteStaff?.name}" wird deaktiviert und erscheint nicht mehr in der Übersicht. 
              Alle bisherigen Daten (Schichten, Zeiterfassung etc.) bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? 'Deaktiviere...' : 'Deaktivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlobalLayout>
  );
}