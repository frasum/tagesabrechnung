import { NavLink, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CalendarDays, BarChart3, Calculator, Settings2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerNavPermissions } from "@/hooks/useManagerNavPermissions";
import { hasPermission } from "@/types/permissions";
import { useMemo } from "react";

const tabs = [
  { label: "Übersicht", path: "", permPath: "zeiterfassung", icon: LayoutDashboard, end: true },
  { label: "Wochenplan", path: "wochenplan", permPath: "zeiterfassung/wochenplan", icon: CalendarDays },
  { label: "Zusammenfassung", path: "zusammenfassung", permPath: "zeiterfassung/zusammenfassung", icon: BarChart3 },
  { label: "Buchhaltung", path: "buchhaltung", permPath: "zeiterfassung/buchhaltung", icon: Calculator },
  { label: "Perioden", path: "perioden", permPath: "zeiterfassung/perioden", icon: Settings2 },
];

export function ZtSubNav() {
  const { restaurant } = useParams();
  const base = `/${restaurant}/zeiterfassung`;
  const { user } = useAuth();
  
  const userLevel = user?.permissionLevel || 'staff';
  const isAdmin = hasPermission(userLevel, 'admin');
  const isManager = userLevel === 'manager';
  
  const { data: managerPaths = [] } = useManagerNavPermissions(
    isManager ? user?.staffId : undefined
  );
  const hasCustomPermissions = isManager && managerPaths.length > 0;

  const visibleTabs = useMemo(() => {
    // Admin sees all
    if (isAdmin) return tabs;
    
    // Manager with custom permissions - filter tabs
    if (isManager && hasCustomPermissions) {
      return tabs.filter(tab => managerPaths.includes(tab.permPath));
    }
    
    // Manager without custom permissions - sees all
    if (isManager) return tabs;
    
    // Staff sees nothing
    return [];
  }, [isAdmin, isManager, hasCustomPermissions, managerPaths]);

  if (visibleTabs.length === 0) return null;

  return (
    <ScrollArea className="w-full">
      <nav className="flex gap-1 border-b bg-muted/30 px-4 pt-2">
        {visibleTabs.map((tab) => {
          const to = tab.path ? `${base}/${tab.path}` : base;
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-background/60 hover:text-foreground",
                  isActive
                    ? "border-b-2 border-primary bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
