

## Bug-Fix: Doppelte Stunden bei restaurantübergreifender Suche

### Problem
Wenn nach einem Mitarbeiter gesucht wird, erscheint er korrekt einmal pro Restaurant+Abteilung (z.B. „YUM · Küche" und „Spicery · Küche"). Aber die **Stunden sind identisch**, weil die Schichten nur nach `employee_id + department` gefiltert werden — nicht nach Restaurant. Jede Zeile zeigt daher alle Schichten aus allen Restaurants.

### Ursache
Schichten (`zt_shifts`) haben keine `restaurant_id`. Der Restaurant-Bezug ergibt sich über: `shift → week_id → week → period_id → period → restaurant_id`. Aktuell wird diese Kette nicht genutzt.

### Lösung

**1. `src/hooks/useCumulatedZtData.ts`** — Mapping `weekId → restaurantId` bereitstellen
- Aus `matchingPeriods` (haben `restaurant_id`) und `weeks` (haben `period_id`) ein Mapping aufbauen: `weekIdToRestaurantId: Record<string, string>`
- Dieses Mapping im Return-Objekt exportieren

**2. `src/pages/zeiterfassung/ZtZusammenfassung.tsx`** — Shifts nach Restaurant filtern
- `RestaurantEmployee`-Typ hat bereits `restaurant_id`
- Bei der Shift-Filterung (Zeile 152 und 158) zusätzlich prüfen: `weekIdToRestaurantId[s.week_id] === emp.restaurant_id` — aber **nur** wenn im Search/Cumulated-Modus
- Gleiche Logik für `getDepartmentTotals` und `grandTotals`

**3. `src/pages/zeiterfassung/ZtBuchhaltung.tsx`** — Gleiche Korrektur
- Shift-Filterung um Restaurant-Check erweitern

**4. `src/pages/zeiterfassung/ZtWochenplan.tsx`** — Gleiche Korrektur
- Wochenstunden pro Mitarbeiter nur für das jeweilige Restaurant berechnen

### Technisches Detail
```text
week → period → restaurant_id

weekIdToRestaurantId = {
  "week-abc": "restaurant-yum",
  "week-def": "restaurant-spicery",
  ...
}

// Beim Filtern:
empShifts = shifts.filter(s => 
  s.employee_id === emp.id 
  && s.department === emp.department
  && weekIdToRestaurantId[s.week_id] === emp.restaurant_id  // NEU
)
```

4 Dateien, keine DB-Änderungen.

