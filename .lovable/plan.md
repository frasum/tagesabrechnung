

## Problem: Restaurant-Wechsel setzt Periode/Woche nicht zurück

Wenn man von Spicery zu YUM wechselt (oder umgekehrt), behält der `ZtContext` die zuvor gewählte Periode bei. Da die Perioden-IDs restaurant-spezifisch sind, werden danach die falschen Wochen und Schichten geladen.

### Ursache

In `src/contexts/ZtContext.tsx`, Zeile 75-78:
```typescript
useEffect(() => {
  if (!periods?.length || selectedPeriodId) return; // ← skippt wenn schon gesetzt
  ...
}, [periods, selectedPeriodId]);
```

Wenn `selectedPeriodId` bereits einen Wert hat (von Spicery), wird der Auto-Select für YUM übersprungen. Die Schichten werden dann für Spicery-Wochen geladen, aber die Mitarbeiterliste zeigt YUM-Mitarbeiter -- keine Übereinstimmungen, leere Tabelle.

### Lösung

Ein `useEffect` hinzufügen, der `selectedPeriodId` und `selectedWeekId` zurücksetzt, wenn sich `restaurantId` ändert.

### Änderung

| Datei | Änderung |
|---|---|
| `src/contexts/ZtContext.tsx` | `useEffect` ergänzen: bei `restaurantId`-Änderung beide IDs zurücksetzen |

