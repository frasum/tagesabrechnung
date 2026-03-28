

# Fix: Restaurant-Scoping in Zusammenfassung (wie in Buchhaltung)

## Problem
Die Zusammenfassung (`ZtZusammenfassung.tsx`) filtert Schichten **nicht** nach Restaurant — im Gegensatz zur Buchhaltung, wo `isShiftInScope` mit `weekIdToRestaurantId` eingebaut wurde. Das Lohnbüro-Portal (`SharedZtView.tsx`) nutzt bereits `weekToRestaurant` korrekt.

## Lösung

### `src/pages/zeiterfassung/ZtZusammenfassung.tsx`

Gleiche `isShiftInScope`-Logik wie in Buchhaltung einbauen:

1. **`weekIdToRestaurantId` aus `cumData` extrahieren** (nach Zeile ~57)

2. **Helper `isShiftInScope` hinzufügen** — identisch zur Buchhaltung:
```tsx
const weekIdToRestaurantId = cumData.weekIdToRestaurantId;
const isShiftInScope = (s: Shift) => {
  if (cumulated && restaurantFilter !== "all") {
    const shiftRestaurant = weekIdToRestaurantId[s.week_id];
    if (shiftRestaurant && shiftRestaurant !== restaurantFilter) return false;
  }
  return true;
};
```

3. **4 Stellen anpassen**, an denen Schichten gefiltert werden:
   - **`employeesWithShiftsUnfiltered`** (Zeile 169–176): `&& isShiftInScope(s)` hinzufügen
   - **`getEmployeeTotals`** (Zeile 181–185): `&& isShiftInScope(s)` hinzufügen
   - **`getDepartmentTotals`** (Zeile 204): `&& isShiftInScope(s)` hinzufügen
   - **`getWeeklyHours`** (Zeile 238–243): `&& isShiftInScope(s)` hinzufügen

### Kein Handlungsbedarf
- **Buchhaltung** — bereits gefixt
- **Lohnbüro-Portal (SharedZtView)** — nutzt bereits `weekToRestaurant` für korrektes Scoping
- **Wochenplan** — nutzt bereits `weekIdToRestaurantId`

Einzige Datei betroffen: `src/pages/zeiterfassung/ZtZusammenfassung.tsx`.

