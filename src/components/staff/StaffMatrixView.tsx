import { useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Staff, PermissionLevel } from '@/hooks/useStaff';
import { useSkills, useEmployeeSkills, useToggleEmployeeSkill } from '@/hooks/useSkills';
import { useUpdateUserRole } from '@/hooks/useUserRole';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface StaffMatrixViewProps {
  staff: Staff[];
  restaurants: Restaurant[];
  onEdit: (staff: Staff) => void;
}

const permLabels: Record<PermissionLevel, string> = {
  staff: 'Mitarbeiter',
  manager: 'Manager',
  admin: 'Admin',
};

const deptOptions = ['Service', 'Küche', 'GL'] as const;

export function StaffMatrixView({ staff, restaurants, onEdit }: StaffMatrixViewProps) {
  const queryClient = useQueryClient();
  const { data: skills = [] } = useSkills();
  const staffIds = useMemo(() => staff.map(s => s.id), [staff]);
  const { data: employeeSkills = [] } = useEmployeeSkills(staffIds);
  const toggleSkill = useToggleEmployeeSkill();
  const updateRole = useUpdateUserRole();

  const deptMapByStaff = useMemo(() => {
    const map = new Map<string, Map<string, Set<string>>>();
    for (const s of staff) {
      const rMap = new Map<string, Set<string>>();
      for (const sr of s.staff_restaurants ?? []) {
        if (!rMap.has(sr.restaurant_id)) rMap.set(sr.restaurant_id, new Set());
        if (sr.zt_department) rMap.get(sr.restaurant_id)!.add(sr.zt_department);
      }
      map.set(s.id, rMap);
    }
    return map;
  }, [staff]);

  const employeeSkillMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const es of employeeSkills) {
      if (!map.has(es.staff_id)) map.set(es.staff_id, new Set());
      map.get(es.staff_id)!.add(es.skill_id);
    }
    return map;
  }, [employeeSkills]);

  const handleDeptToggle = async (staffId: string, restaurantId: string, dept: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        const staffMember = staff.find(s => s.id === staffId);
        const sr = staffMember?.staff_restaurants?.find(
          x => x.restaurant_id === restaurantId && x.zt_department === dept
        );
        if (sr) {
          await supabase.from('staff_restaurants').delete().eq('id', sr.id);
        }
      } else {
        await supabase
          .from('staff_restaurants')
          .insert({ staff_id: staffId, restaurant_id: restaurantId, zt_department: dept as 'Service' | 'Küche' | 'GL' });
      }
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch {
      toast.error('Fehler bei Abteilungszuweisung');
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={300}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold sticky left-0 bg-muted/30 z-10 min-w-[140px]">Name</TableHead>
              <TableHead className="font-semibold min-w-[130px]">Berechtigung</TableHead>
              {restaurants.map(r => (
                <TableHead key={r.id} className="font-semibold text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{r.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground font-normal cursor-help underline decoration-dotted underline-offset-2">Abteilung</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px]">
                        <p className="text-xs">Bestimmt die <strong>Zeiterfassung</strong> und Buchhaltung – in welcher Abteilung werden Stunden erfasst und abgerechnet.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              ))}
              <TableHead className="font-semibold min-w-[200px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted underline-offset-2">Skills</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="text-xs">Bestimmt die <strong>Dienstplan-Positionen</strong> – welche Rollen kann der Mitarbeiter im Schichtplan übernehmen.</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map(s => {
              const staffDeptMap = deptMapByStaff.get(s.id) ?? new Map();
              const staffSkills = employeeSkillMap.get(s.id) ?? new Set();
              const permLevel = (s.permission_level || 'staff') as PermissionLevel;

              return (
                <TableRow key={s.id} className={cn("group", !s.is_active && 'opacity-50')}>
                  {/* Name */}
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="font-semibold hover:text-primary hover:underline underline-offset-2 transition-colors text-left text-sm"
                    >
                      {s.name}
                    </button>
                    {!s.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1.5">Inaktiv</Badge>
                    )}
                  </TableCell>

                  {/* Permission */}
                  <TableCell>
                    <Select
                      value={permLevel}
                      onValueChange={(val) => {
                        updateRole.mutate({ staffId: s.id, permissionLevel: val as PermissionLevel });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['staff', 'manager', 'admin'] as PermissionLevel[]).map(p => (
                          <SelectItem key={p} value={p} className="text-xs">{permLabels[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Restaurants with dept checkboxes */}
                  {restaurants.map(r => {
                    const depts = staffDeptMap.get(r.id) ?? new Set();
                    return (
                      <TableCell key={r.id} className="text-center">
                        <div className="flex flex-col items-start gap-1">
                          {deptOptions.map(d => (
                            <label key={d} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                              <Checkbox
                                checked={depts.has(d)}
                                onCheckedChange={() => handleDeptToggle(s.id, r.id, d, depts.has(d))}
                                className="h-3.5 w-3.5"
                              />
                              <span>{d}</span>
                            </label>
                          ))}
                        </div>
                      </TableCell>
                    );
                  })}

                  {/* Skills */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <TooltipProvider delayDuration={300}>
                        {skills.map(skill => {
                          const has = staffSkills.has(skill.id);
                          return (
                            <Tooltip key={skill.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleSkill.mutate({ staffId: s.id, skillId: skill.id, hasSkill: has })}
                                  className={cn(
                                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer border',
                                    has
                                      ? 'text-white border-transparent'
                                      : 'bg-transparent border-dashed opacity-30 hover:opacity-60'
                                  )}
                                  style={has ? { backgroundColor: skill.color, borderColor: skill.color } : { borderColor: skill.color, color: skill.color }}
                                >
                                  {skill.name}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{has ? `${skill.name} entfernen` : `${skill.name} zuweisen`}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </TooltipProvider>
      </div>
    </Card>
  );
}
