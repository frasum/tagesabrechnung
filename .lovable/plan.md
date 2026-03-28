

# Realtime für Sessions-Tabelle

## Problem
Wenn ein Kellner über die PWA eine neue Tagesabrechnung startet (`useCreateSession`), bekommt der Manager das erst nach manuellem Reload mit — es fehlt eine Realtime-Subscription auf der `sessions`-Tabelle.

## Lösung

### `src/hooks/useSession.ts` — `useSession` Hook erweitern (Zeile 9–29)

Einen `useEffect` mit Supabase Realtime Channel auf `sessions` hinzufügen, gefiltert auf `restaurant_id`. Bei INSERT oder UPDATE wird der Query-Cache invalidiert.

```tsx
export function useSession(date: Date, restaurantId: string | null) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`sessions-realtime-${restaurantId}-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.session_date === dateStr) {
            queryClient.invalidateQueries({ queryKey: ['session', dateStr, restaurantId] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, dateStr, queryClient]);

  return useQuery({ ... }); // bestehende Query bleibt unverändert
}
```

Bei einem neuen INSERT (Kellner startet Abrechnung) wird die Manager-Ansicht sofort aktualisiert — Toast + Sound kommen dann automatisch über die bestehende `waiter_shifts` Subscription, sobald die Session da ist.

Einzige Datei betroffen: `src/hooks/useSession.ts`.

