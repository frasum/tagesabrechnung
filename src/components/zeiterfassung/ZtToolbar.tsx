import { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Period {
  id: string;
  label: string;
}

interface Week {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
}

interface ZtToolbarProps {
  periods: Period[] | undefined;
  selectedPeriodId: string;
  onPeriodChange: (id: string) => void;
  isLocked?: boolean;
  /** Restaurant filter buttons */
  restaurants?: { id: string; name: string }[];
  restaurantFilter?: string | "all";
  onRestaurantFilterChange?: (id: string | "all") => void;
  /** Week selector */
  weeks?: Week[] | null;
  selectedWeekId?: string;
  cumSelectedWeekNum?: number | null;
  onWeekSelect?: (weekId: string, weekNumber: number) => void;
  /** Right-side actions (export buttons etc.) */
  actions?: ReactNode;
}

export function ZtToolbar({
  periods,
  selectedPeriodId,
  onPeriodChange,
  isLocked,
  restaurants,
  restaurantFilter,
  onRestaurantFilterChange,
  weeks,
  selectedWeekId,
  cumSelectedWeekNum,
  onWeekSelect,
  actions,
}: ZtToolbarProps) {
  const showRestaurantFilter = restaurants && restaurants.length > 1 && onRestaurantFilterChange;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3 flex-shrink-0">
      {/* Row 1: Period select + restaurant filter + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedPeriodId} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-background">
            <SelectValue placeholder="Periode wählen" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLocked && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5">Gesperrt</Badge>
        )}

        {showRestaurantFilter && (
          <div className="inline-flex rounded-lg bg-muted p-1 gap-0">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => onRestaurantFilterChange(r.id)}
                className={cn(
                  "relative px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  restaurantFilter === r.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.name}
              </button>
            ))}
            <button
              onClick={() => onRestaurantFilterChange("all")}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                restaurantFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Alle
            </button>
          </div>
        )}

        {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
      </div>

      {/* Row 2: Segmented week selector */}
      {weeks && weeks.length > 0 && (
        <div className="inline-flex rounded-lg bg-muted p-1 gap-0">
          {weeks.map((w) => {
            const isCumulated = restaurantFilter && restaurantFilter !== "all" ? false : restaurantFilter === "all";
            const isSelected = isCumulated
              ? w.week_number === cumSelectedWeekNum
              : w.id === selectedWeekId;
            return (
              <button
                key={isCumulated ? `cum-${w.week_number}` : w.id}
                onClick={() => onWeekSelect?.(w.id, w.week_number)}
                className={cn(
                  "relative px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-semibold">W{w.week_number}</span>
                <span className="ml-1 opacity-70">
                  ({format(parseISO(w.start_date), "dd.MM.")}–{format(parseISO(w.end_date), "dd.MM.")})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
