import { useState, useEffect } from 'react';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Loader2, Save } from 'lucide-react';
import { useStaff } from '@/hooks/useStaff';
import { useAllManagerNavPermissions, useSaveManagerNavPermissions } from '@/hooks/useManagerNavPermissions';
import { MANAGER_NAV_ITEMS } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// Hook to fetch all user roles
function useAllUserRoles() {
  return useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('staff_id, permission_level');
      
      if (error) throw error;
      return data || [];
    },
  });
}

export default function PermissionManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: staffList = [], isLoading: staffLoading } = useStaff(undefined, { includeLinkedProfiles: true });
  const { data: allPermissions = {}, isLoading: permissionsLoading } = useAllManagerNavPermissions();
  const { data: userRoles = [], isLoading: rolesLoading } = useAllUserRoles();
  const savePermissions = useSaveManagerNavPermissions();

  // Local state for tracking changes per manager
  const [localPermissions, setLocalPermissions] = useState<Record<string, string[]>>({});
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);

  // Get all managers from staff list with their roles
  const managers = staffList.filter(staff => {
    const role = userRoles.find(r => r.staff_id === staff.id);
    return role?.permission_level === 'manager';
  });

  // Initialize local state when permissions load
  useEffect(() => {
    if (Object.keys(allPermissions).length > 0 || !permissionsLoading) {
      const initial: Record<string, string[]> = {};
      managers.forEach(manager => {
        initial[manager.id] = allPermissions[manager.id] || [];
      });
      setLocalPermissions(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPermissions, managers.length, permissionsLoading]);

  const handleToggle = (staffId: string, path: string, checked: boolean) => {
    setLocalPermissions(prev => {
      const current = prev[staffId] || [];
      if (checked) {
        return { ...prev, [staffId]: [...current, path] };
      } else {
        return { ...prev, [staffId]: current.filter(p => p !== path) };
      }
    });
  };

  const handleSave = async (staffId: string) => {
    setSavingStaffId(staffId);
    try {
      await savePermissions.mutateAsync({
        staffId,
        paths: localPermissions[staffId] || [],
        callerStaffId: user?.id || '',
      });
      toast({
        title: 'Berechtigungen gespeichert',
        description: 'Die Navigationsberechtigungen wurden aktualisiert.',
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Berechtigungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSavingStaffId(null);
    }
  };

  const isLoading = staffLoading || permissionsLoading || rolesLoading;

  const hasChanges = (staffId: string) => {
    const original = allPermissions[staffId] || [];
    const current = localPermissions[staffId] || [];
    if (original.length !== current.length) return true;
    return !original.every(p => current.includes(p));
  };

  return (
    <GlobalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Berechtigungen verwalten</h1>
            <p className="text-muted-foreground">
              Manager-Navigationszugriff konfigurieren
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : managers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Keine Manager gefunden. Weisen Sie zunächst Mitarbeitern die Manager-Rolle zu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {managers.map(manager => {
              const currentPaths = localPermissions[manager.id] || [];
              const hasNoRestrictions = currentPaths.length === 0;

              return (
                <Card key={manager.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{manager.name}</CardTitle>
                        <CardDescription>
                          {hasNoRestrictions 
                            ? 'Vollzugriff auf alle Manager-Bereiche' 
                            : `${currentPaths.length} Bereich(e) freigeschaltet`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {hasNoRestrictions 
                          ? 'Wählen Sie Bereiche aus, um den Zugriff einzuschränken. Ohne Auswahl hat der Manager Zugriff auf alle Bereiche.'
                          : 'Aktivierte Bereiche sind für diesen Manager sichtbar.'}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {MANAGER_NAV_ITEMS.map(item => (
                          <div key={item.path} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${manager.id}-${item.path}`}
                              checked={currentPaths.includes(item.path)}
                              onCheckedChange={(checked) => 
                                handleToggle(manager.id, item.path, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`${manager.id}-${item.path}`}
                              className="text-sm cursor-pointer"
                            >
                              {item.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleSave(manager.id)}
                          disabled={!hasChanges(manager.id) || savingStaffId === manager.id}
                          size="sm"
                        >
                          {savingStaffId === manager.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Speichern
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
