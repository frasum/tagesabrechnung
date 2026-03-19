import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { SkillColorSettings } from '@/components/settings/SkillColorSettings';
import { useRestaurants } from '@/hooks/useRestaurant';
import { Palette, Loader2 } from 'lucide-react';

export default function SkillSettings() {
  const { data: restaurants = [], isLoading } = useRestaurants();
  const restaurantId = restaurants[0]?.id ?? '';

  return (
    <GlobalLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Dienstplan-Farben</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Hier kannst du die Farben der Skill-Buttons und Abwesenheitsmarkierungen im Dienstplan individuell festlegen.
        </p>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : restaurantId ? (
          <SkillColorSettings restaurantId={restaurantId} />
        ) : (
          <p className="text-sm text-muted-foreground">Kein Restaurant gefunden.</p>
        )}
      </div>
    </GlobalLayout>
  );
}
