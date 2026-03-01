

## Problem: Küchenschicht wird in falsche Zeiterfassung geschrieben

Die Funktion `findWeekForDate` in `syncWaiterToZt.ts` sucht eine Woche (`weeks`-Tabelle) nur nach Datum, ohne das Restaurant zu berücksichtigen. Da mehrere Restaurants eigene Perioden und Wochen haben, wird bei Datumsüberlappung die falsche Woche gefunden.

**Beweis aus der Datenbank:**
- SUMIT's Küchenschicht ist für Restaurant `a1710390` (korrekte Woche: `944b58ee`)
- Die Schicht wurde aber in Woche `1a41c986` geschrieben, die zu Restaurant `3065f458` gehört

### Lösung

| Datei | Änderung |
|---|---|
| `src/lib/syncWaiterToZt.ts` | `findWeekForDate` um Parameter `restaurantId` erweitern. Die Abfrage filtert über `weeks` → `scheduling_periods.restaurant_id`, sodass nur Wochen des richtigen Restaurants gefunden werden. |

Alle Aufrufer (`syncWaiterShiftToZt`, `syncKitchenShiftToZt`) übergeben bereits `restaurantId` — es muss nur an `findWeekForDate` weitergereicht werden.

### Zusätzlich: Bestehenden falschen Eintrag korrigieren

Der falsche zt_shifts-Eintrag (id `b4958213`, employee `0cbe9b9b`, week `1a41c986`) muss gelöscht und in der richtigen Woche (`944b58ee`) neu angelegt werden. Das kann durch erneutes Hinzufügen von SUMIT auf der Küchen-Trinkgeld-Seite geschehen (nach dem Fix), oder per manueller Korrektur in der Zeiterfassung.

