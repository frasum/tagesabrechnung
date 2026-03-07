

# Stunden aus Zeiterfassung (zt_shifts) statt waiter_shifts verwenden

## Problem

Die Provisionsseite liest Stunden aus `waiter_shifts.hours_worked`. Diese Spalte ist nur gefüllt, wenn eine Schicht über den Self-Service finalisiert wurde. Am 26.02. und 27.02. wurde das Schichtende dort nie eingetragen — daher `hours_worked = NULL` → 0 Stunden.

Die Stunden sind aber im Wochenplan (`zt_shifts.total_hours`) korrekt erfasst, wie der Screenshot zeigt. Die Provisionsberechnung greift aktuell nicht auf diese Daten zu.

## Lösung

Zusätzlich `zt_shifts` für den Periodenzeitraum abfragen und die Stunden pro Mitarbeiter/Tag daraus verwenden. Falls beide Quellen Daten liefern, hat `zt_shifts` Vorrang, da die Zeiterfassung die manuelle/korrigierte Quelle ist.

## Änderungen in `ZtProvision.tsx`

1. **Neue Query**: `zt_shifts` für den Periodenzeitraum laden, gefiltert auf Service-Abteilung und das aktuelle Restaurant (via `staff_restaurants`), mit `employee_id`, `shift_date` und `total_hours`.

2. **Stunden-Merge**: Im `aggregated`-Memo die Stunden aus `zt_shifts` pro `staff_id` summieren und bevorzugt verwenden. Fallback auf `waiter_shifts.hours_worked` wenn kein zt_shifts-Eintrag vorhanden.

3. **dailyBreakdown anpassen**: Gleiche Logik — Stunden pro Tag aus `zt_shifts` summieren statt aus `waiter_shifts`.

Nur eine Datei betroffen: `src/pages/zeiterfassung/ZtProvision.tsx`

