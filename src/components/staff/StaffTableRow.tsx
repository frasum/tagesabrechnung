import { Pencil, Trash2, AlertTriangle, Trophy, Smartphone, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableRow, TableCell } from '@/components/ui/table';
import { Staff, enumToRoles } from '@/hooks/useStaff';
import type { WaiterRankingItem } from '@/hooks/useWaiterRanking';

interface StaffTableRowProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  rankingData?: WaiterRankingItem;
}

export function StaffTableRow({ staff, onEdit, onDelete, rankingData }: StaffTableRowProps) {
  const roles = enumToRoles(staff.role);
  const missingNameData = !staff.first_name || !staff.last_name;
  const isLinked = !!staff.linked_profile;
  const linkedEmail = staff.linked_profile?.email;

  const restaurantNames = staff.staff_restaurants
    ?.map(sr => sr.restaurants?.name)
    .filter(Boolean) ?? [];

  const permLevel = staff.permission_level || 'staff';
  const permConfig = {
    staff: { label: 'Mitarbeiter', icon: Shield, className: 'bg-muted text-muted-foreground border-border' },
    manager: { label: 'Manager', icon: ShieldCheck, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    admin: { label: 'Admin', icon: ShieldAlert, className: 'bg-amber-100 text-amber-700 border-amber-200' },
  }[permLevel];
  const PermIcon = permConfig.icon;

  return (
    <TableRow className={!staff.is_active ? 'opacity-50' : ''}>
      {/* Name */}
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{staff.name}</span>
          {!staff.is_active && (
            <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
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
          {rankingData && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-xs font-normal gap-1 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                    <Trophy className="w-3 h-3" />
                    #{rankingData.rank} · {rankingData.avgTipPercent.toFixed(1)}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ø Trinkgeld: {rankingData.avgTipPercent.toFixed(1)}% · {rankingData.shiftsCount} Schichten</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isLinked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Smartphone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>OAuth: {linkedEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* Rolle */}
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {roles.service && <Badge variant="outline" className="text-xs font-normal">Service</Badge>}
          {roles.kitchen && <Badge variant="outline" className="text-xs font-normal">Küche</Badge>}
          {roles.gl && <Badge variant="outline" className="text-xs font-normal">GL</Badge>}
        </div>
      </TableCell>

      {/* Restaurants */}
      <TableCell>
        {restaurantNames.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {restaurantNames.map((name, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
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
        <Badge className={`text-xs font-normal gap-1 ${permConfig.className}`}>
          <PermIcon className="w-3 h-3" />
          {permConfig.label}
        </Badge>
      </TableCell>

      {/* Aktionen */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(staff)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(staff)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
