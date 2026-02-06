import { User, Phone, Euro, Pencil, Trash2, ChefHat, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Staff } from '@/hooks/useStaff';

interface StaffCardProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
}

export function StaffCard({ staff, onEdit, onDelete }: StaffCardProps) {
  const RoleIcon = staff.role === 'kitchen' ? ChefHat : UtensilsCrossed;
  const roleLabel = staff.role === 'kitchen' ? 'Küche' : 'Kellner';

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
              </div>
              
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline" className="font-normal">
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {roleLabel}
                </Badge>
                
                {staff.hourly_rate && staff.hourly_rate > 0 && (
                  <span className="flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    {staff.hourly_rate.toFixed(2)}/h
                  </span>
                )}
                
                {staff.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {staff.phone}
                  </span>
                )}
              </div>
              
              {staff.notes && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {staff.notes}
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
