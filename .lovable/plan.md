

# Fix: BARGELD-Berechnung korrigieren fuer -290,93 EUR

## Problem
Zwei Fehler verhindern das korrekte Ergebnis:

1. **Takeaway wird faelschlicherweise abgezogen**: Laut manueller Abrechnung wird Takeaway bar kassiert und ist kein Abzugsposten. Der kuerzlich eingefuegte Takeaway-Abzug muss rueckgaengig gemacht werden.
2. **Fehlbetrag Vortag fehlt**: Der Wert "Kasse minus Vortag" (244,53 EUR) stammt aus der Excel-Abrechnung vor App-Einfuehrung. Es gibt aktuell keine Moeglichkeit, diesen initialen Fehlbetrag manuell einzutragen.

## Loesung

### Teil 1: Takeaway-Abzug rueckgaengig machen (5 Dateien)

`- takeaway_total` aus der BARGELD-Formel entfernen in:

- `src/pages/DailySummary.tsx` (Zeile 272)
- `src/pages/ManagerDashboard.tsx`
- `src/hooks/useCashBalanceData.ts` (Zeile 95)
- `src/hooks/usePreviousDayDeficit.ts`
- `src/hooks/useStatistics.ts`

**Korrigierte Formel:**
```text
BARGELD = pos_total + GutscheineVK
          - Kreditkarten
          - OrderSmart
          - Wolt
          - GutscheineEL
          - FineDine
          - Einladung
          - OffeneRE
          - Vorschuss
          - Ausgaben
          + Fehlbetrag Vortag
```

### Teil 2: Manuellen Anfangs-Fehlbetrag ermoeglichen

Ein neues Feld `initial_cash_deficit` in der `restaurants`-Tabelle speichert den Startwert aus der Excel-Zeit. Dieser wird in der Berechnung des aeltesten Tages als Vortags-Fehlbetrag beruecksichtigt.

**Aenderungen:**

1. **Datenbank-Migration**: Spalte `initial_cash_deficit` (NUMERIC, default 0) zur `restaurants`-Tabelle hinzufuegen
2. **Einstellungen-UI**: Neues Eingabefeld "Anfangs-Fehlbetrag" in den Restaurant-Einstellungen (oder als einmaliger Eintrag in den Kassenbuch-Einstellungen)
3. **`usePreviousDayDeficit.ts`**: Wenn keine frueheren Sessions existieren, den `initial_cash_deficit` als Startwert verwenden
4. **`useCashBalanceData.ts`**: Den initialen Fehlbetrag beim ersten Tag der Berechnung beruecksichtigen

## Technische Details

### Migration SQL
```text
ALTER TABLE restaurants
ADD COLUMN initial_cash_deficit NUMERIC DEFAULT 0;
```

### Logik-Aenderung in usePreviousDayDeficit
```text
Wenn keine Sessions vor dem gewaehlten Datum existieren:
  -> return restaurant.initial_cash_deficit (z.B. -244.53)
Sonst:
  -> normale Berechnung wie bisher
```

### Eingabefeld
In den Kassenbuch-Einstellungen (PettyCashSetting oder CashBalanceSummary) ein Feld:
- Label: "Fehlbetrag aus vorheriger Abrechnung"
- Erklaerung: "Trage hier den Fehlbetrag aus der letzten Excel-Abrechnung ein"
- Wird einmalig gesetzt und dann automatisch uebernommen

## Erwartetes Ergebnis
Mit Takeaway nicht abgezogen und Vortag = -244,53:
`3.475,20 - 3.216,60 - 134,40 - 170,60 + (-244,53) = -290,93 EUR`

