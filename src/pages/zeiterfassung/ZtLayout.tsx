import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ZtProvider } from "@/contexts/ZtContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerNavPermissions } from "@/hooks/useManagerNavPermissions";
import { hasPermission } from "@/types/permissions";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSfnMode } from "@/hooks/useSfnMode";
import { Switch } from "@/components/ui/switch";

const allTabs = [
  { label: "Wochenplan", path: "", permPath: "zeiterfassung", adminOnly: false },
  { label: "Zusammenfassung", path: "zusammenfassung", permPath: "zeiterfassung/zusammenfassung", adminOnly: false },
  { label: "Buchhaltung", path: "buchhaltung", permPath: "zeiterfassung/buchhaltung", adminOnly: false },
  { label: "Perioden", path: "perioden", permPath: "zeiterfassung/perioden", adminOnly: false },
  { label: "Brutto/Netto", path: "brutto-netto", permPath: "zeiterfassung/brutto-netto", adminOnly: false },
  { label: "Provision", path: "provision", permPath: "zeiterfassung/provision", adminOnly: true },
];

export default function ZtLayout() {
  const { restaurantSlug } = useRestaurant();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${restaurantSlug}/zeiterfassung`;
  const { sfnMode, setSfnMode } = useSfnMode();

  const userLevel = user?.permissionLevel || 'staff';
  const isAdmin = hasPermission(userLevel, 'admin');
  const isManager = userLevel === 'manager';

  const { data: managerPaths = [] } = useManagerNavPermissions(
    isManager ? user?.staffId : undefined
  );
  const hasCustomPermissions = isManager && managerPaths.length > 0;

  // "Zusammenfassung" is always visible for managers (like Kellnerabrechnung)
  const alwaysVisiblePaths = ["zeiterfassung/zusammenfassung"];

  const tabs = useMemo(() => {
    let filtered = allTabs.filter(t => !t.adminOnly || isAdmin);
    if (isAdmin) return filtered;
    if (isManager && hasCustomPermissions) {
      return filtered.filter(t => alwaysVisiblePaths.includes(t.permPath) || managerPaths.includes(t.permPath));
    }
    return filtered;
  }, [isAdmin, isManager, hasCustomPermissions, managerPaths]);

  const isActive = (path: string) => {
    if (path === "") {
      return location.pathname === basePath || location.pathname === basePath + "/";
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  const showSfnToggle = !isActive("") && !isActive("zusammenfassung") && !isActive("provision");

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

          {/* SFN Mode Toggle */}
          {showSfnToggle && <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <span className={cn("text-xs font-medium", sfnMode === "simple" ? "text-foreground" : "text-muted-foreground")}>
                Einfach
              </span>
              <Switch
                checked={sfnMode === "extended"}
                onCheckedChange={(checked) => setSfnMode(checked ? "extended" : "simple")}
              />
              <span className={cn("text-xs font-medium", sfnMode === "extended" ? "text-foreground" : "text-muted-foreground")}>
                §3b
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {sfnMode === "simple"
                ? "Sonntage und Feiertage werden gleich behandelt (50 % Zuschlag). Nachtzuschläge (25 % ab 20:00, 40 % von 00:00–04:00) werden bei Überschneidung mit So/Fei-Stunden nicht zusätzlich berechnet."
                : "Zuschläge nach §3b EStG: Sonntag 50 %, Feiertag 125 % (besondere Feiertage 150 %). Nachtzuschläge werden additiv berechnet — sie stapeln sich mit Sonntags- und Feiertagszuschlägen."}
            </p>
          </div>}

          <Outlet context={{ sfnMode }} />
        </div>
      </ZtProvider>
    </AppLayout>
  );
}
