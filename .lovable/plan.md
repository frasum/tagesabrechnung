

# Fix: Seite springt nach Entsperren der Tagesabrechnung

## Problem

Wenn der Manager auf „Zur Bearbeitung freigeben" klickt, wird `queryClient.invalidateQueries` aufgerufen. Das setzt den Query in den `fetching`-Zustand — React Query zeigt dabei kurz `undefined`/`null` für die Session-Daten, was eine Kaskade auslöst (alle abhängigen Queries wie Waiter-Shifts, Expenses usw. verlieren ihre `sessionId` und werden ebenfalls neu geladen). Das verursacht den visuellen „Sprung".

## Lösung: Optimistisches Update statt Invalidierung

Statt die Query zu invalidieren und neu zu laden, wird die Session-Data **direkt im Cache aktualisiert** via `queryClient.setQueryData`. So bleibt die Session die ganze Zeit im Cache und es gibt keinen kurzen `null`-Zustand.

## Änderung

**`src/hooks/useToggleLock.ts`** — eine Zeile ändern:

```typescript
// VORHER:
queryClient.invalidateQueries({ queryKey: ['session', dateStr, restaurantId] });

// NACHHER:
queryClient.setQueryData(['session', dateStr, restaurantId], (old: any) =>
  old ? { ...old, is_unlocked: unlock, unlocked_at: unlock ? new Date().toISOString() : null, unlocked_by_name: unlock ? (userName || null) : null } : old
);
```

Das ist die einzige Änderung. Die Realtime-Subscription wird die Daten ohnehin im Hintergrund synchronisieren, aber ohne den kurzen `null`-Zustand.

