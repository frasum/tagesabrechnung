

# Fix: Schichten-Aggregation in Buchhaltung bei Restaurant-Filter

## Problem
Beim Mitarbeiter "Appel": Spicery zeigt 2 Schichten, YUM zeigt 16 Schichten, aber "Alle" zeigt ebenfalls nur 16 statt der erwarteten 18. Die Schichten werden beim Restaurant-Wechsel nicht korrekt nach Restaurant gefiltert bzw. zusammengefasst.

## Ursache
In `ZtBuchhaltung.tsx` werden `empShifts` nur nach `employee_id` und `department` gefiltert — ohne Restaurant-Zuordnung. Es fehlt die Nutzung von `weekIdToRestaurantId` aus dem `cumData`-Hook, um Schichten dem richtigen Restaurant zuzuordnen.

Zusätzlich: Wenn ein spezifisches Restaurant (z.B. YUM) ausgewählt ist, werden trotzdem ALLE Schichten beider Restaurants gezählt — oder umgekehrt nur die eines Restaurants.

## Lösung

### `src/pages/zeiterfassung/ZtBuchhaltung.tsx`

1. **`weekIdToRestaurantId` aus `cumData` verwenden** — bereits vom Hook bereitgestellt, aber nie genutzt.

2. **empShifts-Filter erweitern** (Zeile ~247–250): Wenn ein spezifisches Restaurant gewählt ist, nur Schichten zählen, deren `week_id` zu diesem Restaurant gehört. Bei "Alle" alle Schichten einbeziehen.

```tsx
const weekIdToRestaurantId = cumData.weekIdToRestaurantId;

// In der Render-Schleife:
const empShifts = shifts?.filter(s => {
  if (s.employee_id !== emp.id || s.department !== emp.department) return false;
  // Restaurant-Scoping im kumulierten Modus
  if (cumulated && restaurantFilter !== "all") {
    const shiftRestaurant = weekIdToRestaurantId[s.week_id];
    if (shiftRestaurant && shiftRestaurant !== restaurantFilter) return false;
  }
  return true;
}) ?? [];
```

3. **Gleiche Logik für `grandTotals`** (Zeile ~193–208): Selber Restaurant-Filter bei der Berechnung der Gesamtsummen.

4. **Gleiche Logik für `employeesWithShiftsUnfiltered`** (Zeile ~183–189): Sicherstellen, dass nur Mitarbeiter mit Schichten im gewählten Restaurant angezeigt werden.

Einzige Datei betroffen: `src/pages/zeiterfassung/ZtBuchhaltung.tsx`.

