## Problem

Die Spalte „Bargeld" zeigt **−5.854,23 €** statt der erwarteten **−6,24 €** (Wert aus der Tagesabrechnung).

## Ursachenanalyse

`useCashBalanceData` lädt **6 Monate** Sessions; meine vorherige Änderung akkumuliert den operativen Saldo über das gesamte Fenster. Über 6 Monate sammeln sich „Operative Defizite", die in Wirklichkeit längst durch **Bankeinzahlungen / Kassentransfers** ausgeglichen wurden — diese werden vom operativen Saldo absichtlich ignoriert, weil sie laut Memory zur Bargeldbestand-Pipeline gehören.

`usePreviousDayDeficit` (Tagesabrechnung) hat dieselbe konzeptionelle Schwäche, fällt aber nicht auf, weil das Fenster nur **90 Tage** ist.

## Lösung

`displayBargeld` pro Zeile soll **exakt den Wert** zeigen, den `usePreviousDayDeficit` für diesen Tag liefert (= rollender 90-Tage-Operativsaldo + heutiger `dailyCash`).

### Umsetzung in `src/hooks/useCashBalanceData.ts`

1. **Operative Tageskasse separat berechnen** (`dailyCash` ohne Transfers, ohne Deposits — exakt wie in `usePreviousDayDeficit.ts` Zeilen 89–102).

2. **Pro Zeile** den Operativsaldo neu aufbauen, aber nur über die letzten **90 Tage vor diesem Datum**:
   - Tage in chronologischer Reihenfolge durchlaufen
   - Für jeden Tag im 90-Tage-Fenster: `balance += dailyCash; balance = min(0, balance)` (Skim-on-Surplus)
   - `displayBargeld[heute] = dailyCash[heute] + balance_vor_heute`

3. **Performance**: Vorberechnung — eine sortierte Liste `[{date, dailyCash}]` einmal aufbauen, dann mit Two-Pointer-Sliding-Window in O(n) durchlaufen.

### Konsequenz

- Spalte „Bargeld" am 24.04. zeigt exakt den Wert aus der Tagesabrechnung (−6,24 €)
- Bankeinzahlungen / Kassentransfers beeinflussen die Spalte nicht (laut Memory korrekt — sie gehören zur kumulativen Bargeldbestand-Spalte „remainingCash")
- 90-Tage-Fenster verhindert das Aufstauen alter „Pseudo-Defizite"

### Files

- `src/hooks/useCashBalanceData.ts` (nur die `displayBargeld`-Berechnung, kein Schemaeingriff)

Keine UI-Änderung, keine DB-Migration nötig.