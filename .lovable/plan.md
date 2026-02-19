

## Bugfix: Doppelte Defizit-Verrechnung im Wechselgeldbestand

### Problem
Der angezeigte Wechselgeldbestand (1.355,31 EUR) ist falsch, weil Defizite doppelt gezaehlt werden:
- `useCashBalanceData` berechnet `bargeld` bereits MIT Deficit Chaining (Fehlbetrag Vortag eingerechnet)
- `useRemainingCash` und `CashBalance.tsx` summieren diese bereits verketteten Werte dann nochmal Tag fuer Tag auf
- Ergebnis: Negative Tage werden mehrfach abgezogen

### Korrekter Wert
- Angezeigt: 1.355,31 EUR (falsch)
- Korrekt: ca. 1.593,84 EUR (nah an den tatsaechlichen ~1.585 EUR)

### Loesung
Das `bargeld`-Feld in `useCashBalanceData` enthaelt bereits das Deficit Chaining. Die Konsumenten (`useRemainingCash` und `CashBalance.tsx`) fuehren aber ihre eigene kumulative Simulation durch, die nochmal akkumuliert. 

Die einfachste Loesung: `useCashBalanceData` soll zusaetzlich den **Roh-Bargeldwert** (ohne Deficit Chaining) zurueckgeben. Die Skimming-Simulation in `useRemainingCash` und `CashBalance.tsx` arbeitet dann mit den Roh-Werten.

### Aenderungen

**1. `src/hooks/useCashBalanceData.ts`**
- Neues Feld `rawBargeld` zum `CashBalanceRow`-Interface hinzufuegen
- Im Return-Objekt sowohl `bargeld` (mit Chaining, fuer Tabellenansicht) als auch `rawBargeld` (ohne Chaining) zurueckgeben

**2. `src/hooks/useRemainingCash.ts`**
- Statt `row.bargeld` wird `row.rawBargeld` verwendet
- Die Skimming-Logik bleibt gleich, arbeitet aber mit den richtigen Roh-Werten

**3. `src/pages/CashBalance.tsx`**
- Gleiche Anpassung: `row.rawBargeld` statt `row.bargeld` in der kumulativen Simulation verwenden

### Auswirkung
- Wechselgeldbestand in der Tagesabrechnung wird korrekt angezeigt
- Bargeldbestand-Seite (Monatsuebersicht) wird ebenfalls korrigiert
- PDF-Export und Telegram-Bericht profitieren automatisch (nutzen `useRemainingCash`)
- Die Tabellendarstellung der Bargeldbestand-Seite (Spalte "Bargeld") bleibt unveraendert, da sie weiterhin `bargeld` (mit Chaining) nutzt
