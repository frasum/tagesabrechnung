

# Sekundäre Kellner in die Provisionsberechnung einbeziehen

## Problem

Sekundäre Kellner (`second_waiter_name`, `additional_waiters`) arbeiten mit im Service und sollen auch Provision erhalten. Aktuell werden sie:
- Bei `staffDays` mitgezählt (senkt den Ø-Umsatz)
- Aber **nicht** in der Provisionstabelle aufgeführt und erhalten **keine** Provision

## Lösung

Sekundäre Kellner als eigene Einträge in die `aggregated`-Liste aufnehmen, mit Stunden aus `zt_shifts`.

## Änderungen in `ZtProvision.tsx`

1. **`aggregated`-Memo erweitern**: Nach der Iteration über `filteredWaiterData` zusätzlich sekundäre/zusätzliche Kellner erfassen. Für jeden sekundären Kellner per Name → `staffNameToId` die `staff_id` ermitteln und dessen `zt_shifts`-Stunden aus `ztHoursByStaff` laden. Keinen Umsatz zuordnen (Umsatz bleibt beim primären Kellner), aber die Stunden eintragen, damit sie am Provisions-Topf teilnehmen.

2. **GL-Filter anwenden**: Sekundäre Kellner mit GL-Rolle weiterhin ausschließen (via `isGlByName`).

3. **Deduplizierung**: Falls ein Kellner sowohl primär als auch sekundär an verschiedenen Tagen vorkommt, seine Stunden korrekt zusammenführen (gleicher Map-Key über `staff_id`).

4. **`staffDays` und `dailyBreakdown`**: Bleiben wie aktuell — sekundäre Kellner werden dort bereits korrekt mitgezählt. Tooltip zeigt deren Namen.

Ergebnis: Sekundäre Kellner erscheinen in der Provisionstabelle mit 0 € Umsatz aber ihren Stunden, und erhalten anteilig Provision.

