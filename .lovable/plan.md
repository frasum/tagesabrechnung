

## Küchenschichten automatisch in die Zeiterfassung übernehmen

Gleicher Ansatz wie bei den Kellnern: Beim Anlegen einer Küchenschicht wird automatisch ein `zt_shifts`-Eintrag mit Abteilung "Küche" erstellt/aktualisiert.

### Änderungen

| Datei | Änderung |
|---|---|
| `src/lib/syncWaiterToZt.ts` | Umbenennen/erweitern zu generischer Sync-Funktion. Neue exportierte Funktion `syncKitchenShiftToZt` hinzufügen, die `staff_name` → `employee_id` mappt (über `staff_restaurants` mit `zt_department = 'Küche'`), die passende `week_id` findet und einen Upsert in `zt_shifts` mit `department = 'Küche'` durchführt. Die bestehende `findWeekForDate`, `isHoliday` und `upsertZtShift` Hilfsfunktionen werden wiederverwendet. |
| `src/hooks/useSession.ts` | In `useCreateKitchenShift` nach erfolgreichem Insert: Session-Datum laden, dann `syncKitchenShiftToZt` aufrufen mit `staffName`, `shiftStart`, `shiftEnd`, `sessionDate`, `restaurantId`. |
| `src/hooks/useSession.ts` | Auch bei `useDeleteKitchenShift`: den entsprechenden `zt_shifts`-Eintrag löschen (optional, oder Hinweis dass manuell bereinigt werden muss). |

### Sync-Logik (in syncWaiterToZt.ts)

```typescript
export async function syncKitchenShiftToZt(params: {
  staffName: string;
  sessionDate: string;
  shiftStart: string;
  shiftEnd: string;
  restaurantId: string;
}) {
  // 1. findWeekForDate → weekId
  // 2. findStaffByName (mit zt_department = 'Küche') → employeeId
  // 3. isHoliday + isSunday check
  // 4. upsertZtShift mit department = 'Küche'
}
```

Die bestehende `findStaffByName` Funktion filtert aktuell auf `zt_department = 'Service'`. Diese wird generalisiert, sodass die Abteilung als Parameter übergeben werden kann.

### Datenfluss

```text
KitchenTipSplit → useCreateKitchenShift → INSERT kitchen_shifts
                                        → syncKitchenShiftToZt
                                          → lookup staff_id (Küche)
                                          → lookup week_id
                                          → UPSERT zt_shifts (dept=Küche)
```

