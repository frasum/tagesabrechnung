import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useZt } from "@/contexts/ZtContext";

export default function ZtPerioden() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurant();
  const { periods, isPeriodsLoading } = useZt();

  const { data: weeksByPeriod } = useQuery({
    queryKey: ["zt-all-weeks", restaurantId],
    queryFn: async () => {
      const periodIds = periods?.map(p => p.id) ?? [];
      if (!periodIds.length) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .in("period_id", periodIds)
        .order("week_number");
      if (error) throw error;
      return data;
    },
    enabled: !!periods?.length,
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "open" ? "locked" : "open";
      const { error } = await supabase
        .from("scheduling_periods")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zt-periods"] });
      toast.success("Status geändert");
    },
    onError: () => toast.error("Fehler beim Ändern des Status"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Periodenverwaltung</h1>
        <p className="text-sm text-muted-foreground">Perioden werden automatisch erstellt</p>
      </div>

      <div className="grid gap-4">
        {periods?.map((p) => {
          const pWeeks = weeksByPeriod?.filter((w) => w.period_id === p.id) ?? [];
          return (
            <div key={p.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{p.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(p.start_date), "dd.MM.yyyy", { locale: de })} — {format(parseISO(p.end_date), "dd.MM.yyyy", { locale: de })}
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {pWeeks.map((w) => (
                      <Badge key={w.id} variant="outline" className="text-xs">
                        W{w.week_number}: {format(parseISO(w.start_date), "dd.MM")} - {format(parseISO(w.end_date), "dd.MM")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "open" ? "default" : "secondary"}>
                    {p.status === "open" ? "Offen" : "Gesperrt"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => toggleLock.mutate({ id: p.id, currentStatus: p.status })}
                  >
                    {p.status === "open" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {isPeriodsLoading && (
          <p className="text-muted-foreground text-center py-8">Perioden werden geladen...</p>
        )}
        {!isPeriodsLoading && !periods?.length && (
          <p className="text-muted-foreground text-center py-8">Keine Perioden vorhanden</p>
        )}
      </div>
    </div>
  );
}
