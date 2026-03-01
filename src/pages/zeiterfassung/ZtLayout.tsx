import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ZtProvider } from "@/contexts/ZtContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerNavPermissions } from "@/hooks/useManagerNavPermissions";
import { hasPermission } from "@/types/permissions";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

const allTabs = [
  { label: "Wochenplan", path: "", permPath: "zeiterfassung" },
  { label: "Zusammenfassung", path: "zusammenfassung", permPath: "zeiterfassung/zusammenfassung" },
  { label: "Buchhaltung", path: "buchhaltung", permPath: "zeiterfassung/buchhaltung" },
  { label: "Perioden", path: "perioden", permPath: "zeiterfassung/perioden" },
];

export default function ZtLayout() {
  const { restaurantSlug } = useRestaurant();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${restaurantSlug}/zeiterfassung`;

  const userLevel = user?.permissionLevel || 'staff';
  const isAdmin = hasPermission(userLevel, 'admin');
  const isManager = userLevel === 'manager';

  const { data: managerPaths = [] } = useManagerNavPermissions(
    isManager ? user?.staffId : undefined
  );
  const hasCustomPermissions = isManager && managerPaths.length > 0;

  const tabs = useMemo(() => {
    if (isAdmin) return allTabs;
    if (isManager && hasCustomPermissions) {
      return allTabs.filter(t => managerPaths.includes(t.permPath));
    }
    return allTabs; // manager without custom perms sees all
  }, [isAdmin, isManager, hasCustomPermissions, managerPaths]);

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
