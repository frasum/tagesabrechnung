import { Pencil, Trash2, ChefHat, UtensilsCrossed, Store, Smartphone, Shield, ShieldCheck, ShieldAlert, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Staff } from '@/hooks/useStaff';
import type { WaiterRankingItem } from '@/hooks/useWaiterRanking';

interface StaffCardProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  rankingData?: WaiterRankingItem;
}

export function StaffCard({ staff, onEdit, onDelete, rankingData }: StaffCardProps) {
  const RoleIcon = staff.role === 'kitchen' ? ChefHat : UtensilsCrossed;
  const roleLabel = staff.role === 'kitchen' ? 'Küche' : 'Mitarbeiter';
  
  // Get restaurant names from the relation
  const restaurantNames = staff.staff_restaurants
    ?.map(sr => sr.restaurants?.name)
    .filter(Boolean) ?? [];

  // OAuth link status
  const isLinked = !!staff.linked_profile;
  const linkedEmail = staff.linked_profile?.email;

  // Permission level badge config
  const permLevel = staff.permission_level || 'staff';
  const permConfig = {
    staff: { label: 'Mitarbeiter', icon: Shield, className: 'bg-muted text-muted-foreground border-border' },
    manager: { label: 'Manager', icon: ShieldCheck, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    admin: { label: 'Admin', icon: ShieldAlert, className: 'bg-amber-100 text-amber-700 border-amber-200' },
  }[permLevel];
  const PermIcon = permConfig.icon;

  return (
    <Card className={`transition-all ${!staff.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${staff.role === 'kitchen' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}
            `}>
              <RoleIcon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{staff.name}</h3>
                {!staff.is_active && (
                  <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                )}
                {rankingData && (staff.role === 'waiter' || staff.role === 'both') && (
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
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline" className="font-normal">
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {roleLabel}
                </Badge>
                
                <Badge className={`text-xs font-normal gap-1 ${permConfig.className}`}>
                  <PermIcon className="w-3 h-3" />
                  {permConfig.label}
                </Badge>
                
                {/* OAuth link status badge */}
                {isLinked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="text-xs font-normal gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                          <Smartphone className="w-3 h-3" />
                          OAuth
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verknüpft mit: {linkedEmail}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {/* Restaurant badges */}
              {restaurantNames.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                  {restaurantNames.map((name, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs font-normal">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {restaurantNames.length === 0 && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  Kein Restaurant zugewiesen
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(staff)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(staff)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
