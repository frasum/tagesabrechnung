
# Fix: Doppelzählung Fehlbetrag in Bargeldbestand entfernen

## Problem
Die kuerzlich hinzugefuegte `carryOver`-Logik in `useCashBalanceData.ts` verkettet negative Bargeldbestaende zum naechsten Tag. Das fuehrt dazu, dass ein Defizit von z.B. -271,16 EUR sowohl am Ursprungstag als auch am Folgetag erscheint -- die GESAMT-Zeile summiert dann -542,32 EUR statt der korrekten -271,16 EUR.

## Loesung
Die `carryOver`-Logik aus `useCashBalanceData.ts` entfernen. Jeder Tag soll sein eigenstaendiges Bargeld-Ergebnis zeigen. Die GESAMT-Zeile summiert dann korrekt alle Tageswerte auf.

Die Defizit-Verkettung bleibt weiterhin in `usePreviousDayDeficit.ts` fuer die Tagesabrechnung bestehen -- dort wird sie als separater Abzugsposten "Fehlbetrag Vortag" angezeigt.

## Technische Aenderungen

### `src/hooks/useCashBalanceData.ts`
- Variable `carryOver` entfernen (Zeile 63)
- `+ carryOver` aus der Bargeld-Berechnung entfernen (Zeile 103)
- `carryOver = bargeld < 0 ? bargeld : 0;` entfernen (Zeile 106)

Das Ergebnis: Jeder Tag zeigt nur seine eigenen Einnahmen und Abzuege, ohne Uebertrag vom Vortag. Die monatliche Gesamtsumme ist dann korrekt.
