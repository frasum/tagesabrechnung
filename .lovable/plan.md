

## Problem

"YUMMY" und "Yummy" erscheinen als zwei separate Einträge, weil `waiter_name` in verschiedenen Schichten unterschiedlich geschrieben wurde (Groß-/Kleinschreibung). Die Aggregation in `useMonthlyStaffTips.ts` verwendet `waiter_name` als Map-Key ohne Normalisierung — `waiterTipsMap["YUMMY"]` und `waiterTipsMap["Yummy"]` sind zwei verschiedene Einträge.

Dasselbe Problem kann auch bei `kitchen_shifts.staff_name` und bei `additional_waiters` auftreten.

## Lösung

Jetzt wo wir `staff_id` auf den Shifts haben, können wir langfristig nach `staff_id` gruppieren. Aber da Altdaten keine `staff_id` haben, ist die pragmatische Sofort-Lösung:

**Case-insensitive Normalisierung** bei der Aggregation — den Map-Key normalisieren, aber den Original-Namen für die Anzeige beibehalten.

### Änderungen in `src/hooks/useMonthlyStaffTips.ts`

1. **Waiter-Aggregation** (Zeilen 132-145): Map-Key auf `.toLowerCase().trim()` normalisieren, den Anzeigenamen separat speichern (erster gefundener Name wird verwendet)
2. **Kitchen-Aggregation** (analog): Gleiche Normalisierung für `staff_name`
3. **Bevorzugt `staff_id`**: Wenn vorhanden, als Map-Key verwenden statt des Namens — so werden auch bei Namensänderungen die Daten korrekt zusammengeführt

```text
Vorher:  waiterTipsMap["YUMMY"] = { tip: 50 }
         waiterTipsMap["Yummy"] = { tip: 30 }

Nachher: waiterTipsMap["yummy"] = { tip: 80, displayName: "Yummy" }
   oder: waiterTipsMap["<staff_id>"] = { tip: 80, displayName: "Yummy" }
```

