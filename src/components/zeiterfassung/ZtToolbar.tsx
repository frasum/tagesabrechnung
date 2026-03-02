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
  /** Show cumulated toggle */
  showCumulated?: boolean;
  cumulated?: boolean;
  onCumulatedToggle?: () => void;
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
  showCumulated,
  cumulated,
  onCumulatedToggle,
  weeks,
  selectedWeekId,
  cumSelectedWeekNum,
  onWeekSelect,
  actions,
}: ZtToolbarProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3 flex-shrink-0">
      {/* Row 1: Period select + cumulated toggle + actions */}
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

        {showCumulated && (
          <button
            onClick={onCumulatedToggle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              cumulated
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", cumulated ? "bg-primary-foreground" : "bg-muted-foreground/50")} />
            Alle Restaurants
          </button>
        )}

        {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
      </div>

      {/* Row 2: Segmented week selector */}
      {weeks && weeks.length > 0 && (
        <div className="inline-flex rounded-lg bg-muted p-1 gap-0">
          {weeks.map((w) => {
            const isSelected = cumulated
              ? w.week_number === cumSelectedWeekNum
              : w.id === selectedWeekId;
            return (
              <button
                key={cumulated ? `cum-${w.week_number}` : w.id}
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
