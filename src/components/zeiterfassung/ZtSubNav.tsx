import { NavLink, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CalendarDays, BarChart3, Calculator, Settings2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const tabs = [
  { label: "Übersicht", path: "", icon: LayoutDashboard, end: true },
  { label: "Wochenplan", path: "wochenplan", icon: CalendarDays },
  { label: "Zusammenfassung", path: "zusammenfassung", icon: BarChart3 },
  { label: "Buchhaltung", path: "buchhaltung", icon: Calculator },
  { label: "Perioden", path: "perioden", icon: Settings2 },
];

export function ZtSubNav() {
  const { restaurant } = useParams();
  const base = `/${restaurant}/zeiterfassung`;

  return (
    <ScrollArea className="w-full">
      <nav className="flex gap-1 border-b bg-muted/30 px-4 pt-2">
        {tabs.map((tab) => {
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
