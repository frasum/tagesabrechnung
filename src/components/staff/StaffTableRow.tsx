import { Pencil, Trash2, AlertTriangle, Trophy, Smartphone, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Staff } from '@/hooks/useStaff';
import type { WaiterRankingItem } from '@/hooks/useWaiterRanking';

interface StaffTableRowProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  rankingData?: WaiterRankingItem;
}

const deptColors: Record<string, string> = {
  'Service': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'Küche': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'GL': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const permConfig = {
  staff: { label: 'Mitarbeiter', icon: Shield, className: 'bg-muted text-muted-foreground border-border' },
  manager: { label: 'Manager', icon: ShieldCheck, className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  admin: { label: 'Admin', icon: ShieldAlert, className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
} as const;

export function StaffTableRow({ staff, onEdit, onDelete, rankingData }: StaffTableRowProps) {
  const departments = new Set(
    staff.staff_restaurants?.map(sr => sr.zt_department).filter(Boolean) ?? []
  );
  const missingNameData = !staff.first_name || !staff.last_name;
  const isLinked = !!staff.linked_profile;
  const linkedEmail = staff.linked_profile?.email;
  const restaurantNames = staff.staff_restaurants?.map(sr => sr.restaurants?.name).filter(Boolean) ?? [];
  const permLevel = (staff.permission_level || 'staff') as keyof typeof permConfig;
  const perm = permConfig[permLevel];
  const PermIcon = perm.icon;

  return (
    <TableRow className={cn("group transition-colors", !staff.is_active && 'opacity-50')}>
      {/* Name */}
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{staff.name}</span>
              {!staff.is_active && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inaktiv</Badge>
              )}
              {missingNameData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{!staff.first_name && !staff.last_name ? 'Vor- und Nachname fehlen' : !staff.first_name ? 'Vorname fehlt' : 'Nachname fehlt'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isLinked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent><p>OAuth: {linkedEmail}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {rankingData && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <Trophy className="w-3 h-3" />
                #{rankingData.rank} · {rankingData.avgTipPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Rolle */}
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {(['Service', 'Küche', 'GL'] as const).map(dept =>
            departments.has(dept) ? (
              <Badge key={dept} variant="outline" className={cn("text-[11px] font-medium border", deptColors[dept])}>
                {dept}
              </Badge>
            ) : null
          )}
        </div>
      </TableCell>

      {/* Restaurants */}
      <TableCell>
        {restaurantNames.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {restaurantNames.map((name, idx) => (
              <Badge key={idx} variant="secondary" className="text-[11px] font-normal">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-destructive">Keins</span>
        )}
      </TableCell>

      {/* Berechtigung */}
      <TableCell>
        <Badge className={cn("text-[11px] font-medium gap-1 border", perm.className)}>
          <PermIcon className="w-3 h-3" />
          {perm.label}
        </Badge>
      </TableCell>

      {/* Aktionen */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(staff)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(staff)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}