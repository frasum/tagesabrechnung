

## Plan: Schicht-Duplikat-Prüfung über Betriebsstätten und Departments hinweg

### Problem
Mitarbeiter, die in mehreren Restaurants oder Departments arbeiten, können aktuell am selben Tag in verschiedenen Betriebsstätten/Departments Schichten eingetragen bekommen. Es soll verhindert werden, dass ein Mitarbeiter am selben Tag mehr als eine Schicht hat — unabhängig von Restaurant oder Department.

### Ansatz: Validierung im Frontend

Da die `zt_shifts`-Tabelle keinen globalen Unique Constraint auf `(employee_id, shift_date)` hat (der bestehende ist `(employee_id, shift_date, department)`), und ein solcher Constraint die bestehende Multi-Department-Logik brechen würde, implementieren wir die Prüfung als Validierung vor dem Speichern.

### Änderungen

**1. `src/pages/zeiterfassung/ZtWochenplan.tsx` — `upsertShift` Mutation**
- Vor dem Upsert: Prüfung ob für den Mitarbeiter am selben Tag bereits eine Schicht in einem **anderen** Department oder einer **anderen** Woche (= anderes Restaurant) existiert
- Query: `zt_shifts` filtern nach `employee_id` + `shift_date`, aber **nicht** nach `department` oder `week_id`
- Wenn ein Eintrag existiert, der nicht zum aktuellen Department/Week gehört → Fehler-Toast anzeigen und Mutation abbrechen
- Ausnahme: Wenn der bestehende Eintrag nur ein `absence_type` hat (Urlaub/Krank) und keine tatsächliche Schicht, wird er ebenfalls als Konflikt behandelt

**2. `src/lib/syncWaiterToZt.ts` — `syncWaiterShiftToZt` und `syncKitchenShiftToZt`**
- Gleiche Prüfung vor dem Upsert: existiert bereits eine Schicht für den Mitarbeiter an dem Tag in einem anderen Department?
- Falls ja: `console.warn` loggen und Sync überspringen (kein Fehler-UI, da automatischer Prozess)

**3. `src/components/zeiterfassung/ShiftTimeOverride.tsx` — Bulk-Erzeugung**
- Bei der Schichterzeugung (Sections 2 & 3): vor dem Insert prüfen ob am jeweiligen Tag bereits eine Schicht in einem anderen Department/Restaurant existiert
- Falls ja: Tag überspringen und am Ende im Toast die Anzahl übersprungener Tage melden

### Technische Details

Prüf-Query (vor jedem Upsert/Insert):
```typescript
const { data: conflict } = await supabase
  .from("zt_shifts")
  .select("id, department, week_id")
  .eq("employee_id", employeeId)
  .eq("shift_date", shiftDate)
  .neq("department", currentDepartment)
  .maybeSingle();

if (conflict) {
  // Schicht existiert bereits in anderem Department/Restaurant
  throw new Error(`Schicht existiert bereits am ${shiftDate} in Abt. ${conflict.department}`);
}
```

Für die restaurant-übergreifende Prüfung reicht `neq("department", ...)` nicht — wir brauchen eine Prüfung die **alle** existierenden Schichten für `(employee_id, shift_date)` findet und prüft ob eine davon nicht der aktuelle Eintrag ist:

```typescript
const { data: allShiftsOnDay } = await supabase
  .from("zt_shifts")
  .select("id, department, week_id")
  .eq("employee_id", employeeId)
  .eq("shift_date", shiftDate);

const hasConflict = allShiftsOnDay?.some(s => 
  s.department !== currentDepartment || s.week_id !== currentWeekId
);
```

### Kein DB-Schema-Change nötig
Alles wird als Frontend-Validierung umgesetzt.

