import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DienstplanLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantSlug } = useRestaurant();

  const currentTab = location.pathname.endsWith('/service') ? 'service' : 'kueche';

  const handleTabChange = (value: string) => {
    navigate(`/${restaurantSlug}/dienstplan/${value}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Dienstplan</h1>
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="kueche">Küche</TabsTrigger>
              <TabsTrigger value="service">Service / GL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Outlet />
      </div>
    </AppLayout>
  );
}
