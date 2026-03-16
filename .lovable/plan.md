

## Fix: Mitarbeiter-Deduplizierung im Dienstplan-Grid

### Problem
`useRestaurantEmployees` liefert pro `staff_restaurants`-Zeile einen Eintrag. Mo hat zwei Einträge (Service + GL), erscheint daher doppelt.

### Lösung
In `MonthlyGrid.tsx` die `filteredEmployees` nach `staff_id` deduplizieren. Mitarbeiter, die sowohl Service als auch GL haben, erscheinen nur einmal.

### Änderung

**`src/components/dienstplan/MonthlyGrid.tsx`** -- im `filteredEmployees` useMemo:

Nach dem `.filter()` eine Deduplizierung per `Map` einfügen:

```typescript
const filteredEmployees = useMemo(() => {
  const filtered = employees.filter(e => {
    const dept = e.department;
    if (department === 'kitchen') return dept === 'Küche';
    return dept === 'Service' || dept === 'GL';
  });
  // Deduplizieren nach staff id
  const unique = new Map<string, typeof filtered[0]>();
  for (const emp of filtered) {
    if (!unique.has(emp.id)) unique.set(emp.id, emp);
  }
  return Array.from(unique.values());
}, [employees, department]);
```

Keine DB-Änderung nötig. Eine Zeile Code-Ergänzung.

