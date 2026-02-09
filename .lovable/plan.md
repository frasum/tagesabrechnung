
# Dritte Rolle "Beides" fuer Mitarbeiter

## Uebersicht
Mitarbeiter, die sowohl als Kellner als auch in der Kueche arbeiten, bekommen eine eigene Rolle `both`. Sie erscheinen dann in **beiden** Gruppen (Kellner und Kueche) in der Uebersicht.

## Aenderungen

### 1. Datenbank: Neuen Enum-Wert hinzufuegen
- Den Wert `both` zum bestehenden `staff_role`-Enum hinzufuegen per Migration

### 2. TypeScript-Typen anpassen
- **`src/hooks/useStaff.ts`**: `StaffRole` erweitern auf `'waiter' | 'kitchen' | 'both'`

### 3. Mitarbeiter-Dialog: Dritte Option anbieten
- **`src/components/staff/StaffDialogNative.tsx`**: Im Rollen-Dropdown eine dritte Option "Kellner & Kueche" hinzufuegen

### 4. Gruppierung in der Mitarbeiterverwaltung anpassen
- **`src/pages/StaffManagement.tsx`**: Mitarbeiter mit Rolle `both` werden sowohl in die Kellner- als auch in die Kueche-Gruppe einsortiert. Im Filter-Tab zaehlen sie bei beiden mit.

### 5. StaffSelect-Komponente anpassen
- **`src/components/shared/StaffSelect.tsx`**: Mitarbeiter mit Rolle `both` werden sowohl bei `role='waiter'` als auch bei `role='kitchen'` Abfragen angezeigt

### 6. Statistiken und andere Stellen
- **`src/components/statistics/MonthlyTipBreakdown.tsx`** und aehnliche Stellen: `both`-Mitarbeiter erscheinen in beiden Tabs

## Technische Details

**Migration SQL:**
```sql
ALTER TYPE staff_role ADD VALUE 'both';
```

**Gruppierungslogik (StaffManagement.tsx):**
```typescript
if (staff.role === 'waiter' || staff.role === 'both') {
  group.waiters.push(staff);
}
if (staff.role === 'kitchen' || staff.role === 'both') {
  group.kitchen.push(staff);
}
```

**StaffSelect Filter:**
```typescript
// Bei role='waiter': zeige waiter + both
// Bei role='kitchen': zeige kitchen + both
const filteredByRole = staffList.filter(s => s.role === role || s.role === 'both');
```
