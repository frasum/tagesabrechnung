

# 6 Code-Qualitäts-Verbesserungen — Umsetzungsplan

## Schritt 1: Neuer `useToggleLock` Hook + Query-Invalidierung (Punkte 1 + 5)

**Neue Datei: `src/hooks/useToggleLock.ts`**

Extrahiert die identische `handleToggleLock`-Logik aus allen 3 Seiten. Nutzt `useQueryClient().invalidateQueries()` statt `window.location.reload()`. Der Query-Key `['session', dateStr, restaurantId]` wird bereits von `useSession` verwendet — passt also direkt.

```typescript
// Parameter: sessionId, restaurantId, userName, selectedDate
// Returns: { handleToggleLock: (unlock: boolean) => Promise<void> }
// Invalidiert: ['session', dateStr, restaurantId]
```

**Geändert**: `DailySummary.tsx`, `WaiterCashUp.tsx`, `KitchenTipSplit.tsx` — `handleToggleLock` entfernen, durch Hook ersetzen.

---

## Schritt 2: Safe JSON.parse in `Login.tsx` (Punkt 2)

Zeilen 87 und 113: `JSON.parse(stored)` in try-catch wrappen. Bei Fehler → `localStorage.removeItem('spicery_auth_user')`, Variable auf `null` setzen.

---

## Schritt 3: Session-Date-Validierung in `syncWaiterToZt.ts` (Punkt 3)

Vor Zeile 155: Regex `/^\d{4}-\d{2}-\d{2}$/` prüfen + `isNaN(dateObj.getTime())`. Bei ungültigem Datum → `console.warn()`, `isSundayOrHoliday = false` setzen (Zuschläge überspringen).

---

## Schritt 4: Time-Validierung in `shiftCalculations.ts` (Punkt 4)

In `timeToMinutes`: Nach dem Split prüfen ob `h` (0–23) und `m` (0–59) gültig sind. Bei ungültigem Wert → `throw new Error(`Invalid time: ${time}`)`.

---

## Schritt 5: `useMemo` in `RestaurantContext.tsx` (Punkt 6)

Die Dedup-Logik (Zeile 100–103) liegt bereits **innerhalb der `queryFn`** von React Query — sie wird also nur bei Datenabruf ausgeführt, nicht bei jedem Render. Ein `useMemo` wäre hier technisch unnötig, da React Query das Ergebnis bereits cached. Ich werde trotzdem ein `select`-Transform auf die Query setzen, um die Intention klar zu machen.

---

## Zusammenfassung

| Datei | Änderung |
|---|---|
| `src/hooks/useToggleLock.ts` | **NEU** — shared Hook |
| `src/pages/DailySummary.tsx` | handleToggleLock → useToggleLock |
| `src/pages/WaiterCashUp.tsx` | handleToggleLock → useToggleLock |
| `src/pages/KitchenTipSplit.tsx` | handleToggleLock → useToggleLock |
| `src/pages/Login.tsx` | try-catch um JSON.parse |
| `src/lib/syncWaiterToZt.ts` | Date-Validierung |
| `src/lib/shiftCalculations.ts` | Time-Validierung |
| `src/contexts/RestaurantContext.tsx` | Klarstellung der Dedup-Logik |

