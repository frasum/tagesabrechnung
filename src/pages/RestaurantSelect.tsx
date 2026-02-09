import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, MapPin } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

export default function RestaurantSelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const staffId = user.staffId || user.id;

    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from('staff_restaurants')
        .select('restaurant_id, restaurants(id, name, slug)')
        .eq('staff_id', staffId);

      if (error || !data || data.length === 0) {
        // Fallback: go to default
        navigate(isMobile ? '/spicery/waiter' : '/spicery', { replace: true });
        return;
      }

      const mapped = data
        .map((sr: any) => sr.restaurants as Restaurant)
        .filter(Boolean);

      if (mapped.length === 1) {
        const slug = mapped[0].slug;
        navigate(isMobile ? `/${slug}/waiter` : `/${slug}`, { replace: true });
        return;
      }

      setRestaurants(mapped);
      setIsLoading(false);
    };

    fetchRestaurants();
  }, [user, navigate, isMobile]);

  const handleSelect = (slug: string) => {
    navigate(isMobile ? `/${slug}/waiter` : `/${slug}`, { replace: true });
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-muted-foreground animate-pulse">Lade Restaurants…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Willkommen, {user.name}!</CardTitle>
          <CardDescription>
            Welches Restaurant möchtest du öffnen?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {restaurants.map((r) => (
            <Button
              key={r.id}
              variant="outline"
              className="w-full h-14 text-lg justify-start gap-3"
              onClick={() => handleSelect(r.slug)}
            >
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              {r.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
