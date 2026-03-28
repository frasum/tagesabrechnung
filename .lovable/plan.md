

# Echtzeit-Benachrichtigung bei Kellner-Abrechnung

## Aktueller Stand
Die Realtime-Subscription in `useWaiterShifts` (Zeile 90–112) lauscht auf `postgres_changes` und invalidiert den Query-Cache — aber **ohne Benachrichtigung** an den Manager.

## Lösung
Die bestehende Realtime-Callback erweitern: Bei einem `UPDATE`-Event, bei dem `submitted_at` neu gesetzt wird (vorher null → jetzt gesetzt), einen **Toast mit Sound** anzeigen.

## Technische Änderungen

### 1. Sound-Datei hinzufügen
Eine kurze Notification-Sound-Datei (`public/notification.mp3`) bereitstellen — ca. 1 Sekunde, dezenter Ton.

### 2. `src/hooks/useSession.ts` — Realtime-Callback erweitern (Zeile ~93–107)

Statt nur den Cache zu invalidieren, prüfen ob es ein `UPDATE` ist, bei dem `submitted_at` neu gesetzt wurde (das passiert, wenn ein Kellner seine Abrechnung absendet). Falls ja:
- Einen `toast()` (sonner) mit dem Kellner-Namen anzeigen
- Einen kurzen Sound abspielen via `new Audio('/notification.mp3').play()`

```tsx
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'waiter_shifts',
    filter: `session_id=eq.${sessionId}`,
  },
  (payload) => {
    queryClient.invalidateQueries({ queryKey: ['waiter-shifts', sessionId] });
    
    // Notify manager when a waiter submits
    if (
      payload.eventType === 'UPDATE' &&
      payload.new?.submitted_at &&
      !payload.old?.submitted_at
    ) {
      const name = payload.new.waiter_name || 'Ein Kellner';
      toast.success(`${name} hat abgerechnet`, {
        description: 'Die Abrechnung wurde eingereicht.',
        duration: 6000,
      });
      try {
        new Audio('/notification.mp3').play();
      } catch {}
    }
  }
)
```

Zwei Dateien betroffen: `useSession.ts` (Logik) + `public/notification.mp3` (Asset).

