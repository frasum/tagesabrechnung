

# Nur Service-Stunden für die Provision berücksichtigen

## Problem

Die aktuelle Query holt `zt_shifts` gefiltert nach Mitarbeitern, die in `staff_restaurants` der Abteilung "Service" zugeordnet sind. Aber ein Mitarbeiter kann **beiden** Abteilungen zugewiesen sein (Service + Küche) und hat dann `zt_shifts`-Einträge mit `department = 'Service'` **und** `department = 'Küche'`. Aktuell werden alle Stunden summiert — auch die Küchenstunden.

## Lösung

In der `zt_shifts`-Query einen zusätzlichen Filter auf `department = 'Service'` setzen. Die `zt_shifts`-Tabelle hat bereits eine `department`-Spalte, die genau diesen Zweck erfüllt.

## Änderung in `ZtProvision.tsx`

**Eine Zeile hinzufügen** in der bestehenden zt_shifts-Query (ca. Zeile 150–155):

```typescript
const { data, error } = await supabase
  .from("zt_shifts")
  .select("employee_id, shift_date, total_hours")
  .in("employee_id", staffIds)
  .eq("department", "Service")  // ← NEU
  .gte("shift_date", selectedPeriod.start_date)
  .lte("shift_date", selectedPeriod.end_date);
```

Damit werden nur Schichten mit `department = 'Service'` in die Stundenberechnung einbezogen. Küchenstunden desselben Mitarbeiters werden ignoriert.

