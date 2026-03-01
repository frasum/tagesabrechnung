import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Share2, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useZt } from "@/contexts/ZtContext";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

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

  const sharePeriod = useMutation({
    mutationFn: async (id: string) => {
      const token = generateToken();
      const { error } = await supabase
        .from("scheduling_periods")
        .update({ share_token: token, shared_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zt-periods"] });
      toast.success("Freigabe-Link erstellt");
    },
    onError: () => toast.error("Fehler beim Erstellen des Links"),
  });

  const revokePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduling_periods")
        .update({ share_token: null, shared_at: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zt-periods"] });
      toast.success("Freigabe widerrufen");
    },
    onError: () => toast.error("Fehler beim Widerrufen"),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/zt/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Periodenverwaltung</h1>
        <p className="text-sm text-muted-foreground">Perioden werden automatisch erstellt</p>
      </div>

      <div className="grid gap-4">
        {periods?.map((p) => {
          const pWeeks = weeksByPeriod?.filter((w) => w.period_id === p.id) ?? [];
          const shareToken = (p as any).share_token as string | null;
          const sharedAt = (p as any).shared_at as string | null;

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

              {/* Sharing section */}
              <div className="mt-3 pt-3 border-t border-border/50">
                {shareToken ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                      <Share2 className="h-3 w-3 mr-1" /> Freigegeben
                      {sharedAt && ` seit ${format(parseISO(sharedAt), "dd.MM.yyyy HH:mm", { locale: de })}`}
                    </Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyLink(shareToken)}>
                      <Copy className="h-3 w-3" /> Link kopieren
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => revokePeriod.mutate(p.id)}>
                      <XCircle className="h-3 w-3" /> Widerrufen
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sharePeriod.mutate(p.id)}>
                    <Share2 className="h-3 w-3" /> Für Lohnbüro freigeben
                  </Button>
                )}
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
