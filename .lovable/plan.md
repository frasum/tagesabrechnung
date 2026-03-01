

## Fix: Doppelte Einträge im Restaurant-Switcher

### Ursache
Der `useRestaurants` Hook in `src/contexts/RestaurantContext.tsx` (Zeile 100-102) gibt die Restaurants ohne Deduplizierung zurück. Da ein Mitarbeiter mehrere `staff_restaurants`-Einträge pro Restaurant haben kann (z.B. einen für Service, einen für GL), erscheint "Spicery" mehrfach.

### Lösung
In `src/contexts/RestaurantContext.tsx`, Zeile 100-102: Nach dem Mapping die Restaurants nach ID deduplizieren — identisch zur Lösung in `RestaurantSelect.tsx`.

```typescript
const mapped = (data ?? [])
  .map((sr: any) => sr.restaurants as Restaurant)
  .filter(Boolean);
// Deduplizieren nach ID
return Array.from(new Map(mapped.map(r => [r.id, r])).values());
```

### Betroffene Datei
- `src/contexts/RestaurantContext.tsx` — nur Zeile 100-102 anpassen.

