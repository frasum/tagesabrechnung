import { Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOrdersmartInTakeaway } from '@/hooks/useSettings';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';

export function OrdersmartTakeawaySetting() {
  const { restaurantId } = useRestaurant();
  const { ordersmartInTakeaway, isLoading, updateOrdersmartInTakeaway, isUpdating } = useOrdersmartInTakeaway(restaurantId);
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    if (!restaurantId) return;
    updateOrdersmartInTakeaway(
      { value: checked, restaurantId },
      {
        onSuccess: () => toast({ title: 'Einstellung gespeichert' }),
        onError: () => toast({ title: 'Fehler beim Speichern', variant: 'destructive' }),
      }
    );
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardContent className="py-4 px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">SoUse in Takeaway enthalten</Label>
              <p className="text-xs text-muted-foreground">
                Wenn deaktiviert, wird SoUse in der POS-Differenz separat abgezogen.
              </p>
            </div>
          </div>
          <Switch
            checked={ordersmartInTakeaway}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}
