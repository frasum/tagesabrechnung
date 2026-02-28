import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ZtProvider } from "@/contexts/ZtContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

const tabs = [
  { label: "Wochenplan", path: "" },
  { label: "Zusammenfassung", path: "zusammenfassung" },
  { label: "Buchhaltung", path: "buchhaltung" },
  { label: "Perioden", path: "perioden" },
];

export default function ZtLayout() {
  const { restaurantSlug } = useRestaurant();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/${restaurantSlug}/zeiterfassung`;

  const isActive = (path: string) => {
    if (path === "") {
      return location.pathname === basePath || location.pathname === basePath + "/";
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  return (
    <AppLayout>
      <ZtProvider>
        <div className="space-y-4">
          {tabs.length > 1 && (
            <nav className="flex gap-1 border-b border-border pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path ? `${basePath}/${tab.path}` : basePath)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    isActive(tab.path)
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}
          <Outlet />
        </div>
      </ZtProvider>
    </AppLayout>
  );
}
