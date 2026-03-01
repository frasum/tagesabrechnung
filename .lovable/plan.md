

## Problem

SUMIT erscheint in der monatlichen Küchen-Trinkgeldauswertung mit 28,39€, obwohl er `participates_in_pool = false` in den Stammdaten hat. Die Berechnung in `useMonthlyStaffTips` prueft bei der Kuechenverteilung nicht den Pool-Status -- sie verteilt das Trinkgeld an alle Kuechenmitarbeiter proportional nach Stunden, ohne `participates_in_pool` zu beruecksichtigen.

Die Tagesabrechnung (`KitchenTipSplit`) macht es korrekt: dort werden Non-Pool-Mitarbeiter ausgeschlossen. In der monatlichen Auswertung fehlt diese Pruefung.

## Loesung

| Datei | Aenderung |
|---|---|
| `src/hooks/useMonthlyStaffTips.ts` | Staff-Tabelle laden, um `participates_in_pool`-Status pro Mitarbeiter zu pruefen. Bei der Kuechenverteilung Non-Pool-Mitarbeiter von der Trinkgeldberechnung ausschliessen (Stunden zaehlen nicht in den Divisor, Trinkgeld = 0). Stunden weiterhin anzeigen. |

### Details

1. Zusaetzliche Query auf `staff`-Tabelle mit `select('name, participates_in_pool')` und ggf. `.in('restaurant_id', restaurantIds)`
2. Helper-Funktion `isPoolParticipant(staffName)` analog zu `KitchenTipSplit`
3. In der Kuechenpool-Berechnung (Zeile 150-174):
   - `totalHours` nur aus Pool-Mitgliedern berechnen
   - `tipShare` nur an Pool-Mitglieder vergeben
   - Non-Pool-Mitarbeiter bekommen weiterhin Stunden getrackt, aber 0€ Trinkgeld

