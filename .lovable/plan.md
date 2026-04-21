
## Bargeld-Logik auf beiden Seiten vereinheitlichen

## Problem
Auf der Tagesabrechnung ist die Logik aktuell nicht konsistent mit der Bargeldbestand-Seite. Deshalb erscheinen Werte wie:

- „Fehlbetrag Vortag“ zu hoch
- „Differenz zum Wechselgeldbestand“ als falsche Zahl
- „Wechselgeldbestand (soll ist 2000 €)“ ebenfalls falsch

Der Screenshot zeigt genau diese Folgefehler: Die Seite rechnet mit einem falschen Vortagsübertrag weiter.

## Hauptursache
Die Bargeldberechnung ist derzeit auf mehrere Stellen verteilt und widersprüchlich:

1. `compute_carry_over` berücksichtigt nur `sessions` und `register_transfers`, aber **keine `bank_deposits`**.
2. `compute_carry_over` kappt positive Überträge weiterhin auf `0`, obwohl laut Projektlogik **positive und negative Salden weitergeführt** werden sollen.
3. `useRemainingCash` simuliert den Kassenbestand lokal neu, aber **ohne Bankeinzahlungen, ohne Transfers und ohne vollständigen Vorlauf**.
4. `CashBalanceSummary` berechnet `wechselgeldbestand={pettyCash + cumulativeCash}` und ignoriert dabei ebenfalls Bankeinzahlungen.
5. Die Tagesseite zeigt bei „Differenz zum Wechselgeldbestand“ aktuell faktisch den verketteten Bargeldwert statt der echten Differenz zum Soll-Wechselgeld.

## Ziel
Eine einzige, konsistente Bargeldlogik für:

- Bargeldbestand-Seite
- Tagesabrechnung
- Fehlbetrag Vortag
- Wechselgeldbestand
- Abschöpfung / „in den Tresor legen“

## Umsetzung

### 1. Serverseitige Bargeld-Kette korrigieren
Die Backend-Funktion für den Übertrag wird so angepasst, dass sie alle Bargeld-bewegenden Ereignisse pro Tag berücksichtigt:

- Tages-Bargeld aus `sessions`
- Kassentransfers aus `register_transfers`
- Bankeinzahlungen aus `bank_deposits`
- Startwert aus `initial_cash_deficit`

Dabei wird die Tageskette vollständig berechnet, statt positive Salden auf 0 abzuschneiden.

### 2. Einheitliches Tagesmodell erzeugen
Die gemeinsame Datengrundlage für jeden Tag soll diese Werte liefern:

- `rawBargeld` = reines Tages-Bargeld
- `transferEffect`
- `depositEffect`
- `balanceBeforeSkim`
- `skimAmount`
- `remainingCash`
- `previousDeficit`

So greifen beide Seiten auf dieselbe Wahrheit zu.

### 3. `useCashBalanceData` auf die korrigierte Logik umstellen
Der Hook wird so umgebaut, dass er nicht mehr eine unvollständige Client-Kette nachbildet, sondern die korrigierte Bargeldlogik verwendet.

Damit verschwinden Abweichungen zwischen:

- Tabelle „Bargeldbestand“
- Summary-Karten
- Tagesabrechnung

### 4. `usePreviousDayDeficit` vereinfachen
Der Hook soll den Vortags-Fehlbetrag direkt aus dem einheitlichen Tagesmodell beziehen, statt indirekt aus einer unvollständigen Kette.

Ergebnis:
- „Fehlbetrag Vortag“ wird auf beiden Seiten identisch.

### 5. `useRemainingCash` ersetzen
Die lokale Neusimulation wird entfernt bzw. auf das gemeinsame Tagesmodell umgestellt.

Dann werden korrekt berücksichtigt:

- historischer Übertrag
- Bankeinzahlungen
- Tresor-/Kassentransfers
- Abschöpfung auf Wechselgeldbestand

### 6. Tagesabrechnung-Anzeige korrigieren
In `DailySummary` / `ExcelLayout` werden die Kennzahlen semantisch richtig befüllt:

- „Tages-Bargeld“ = nur heutiger Tageswert
- „Fehlbetrag Vortag“ = echter negativer Übertrag vom Vortag
- „Differenz zum Wechselgeldbestand“ = tatsächliche Abweichung gegenüber Soll-Wechselgeld
- „Wechselgeldbestand (soll ist 2000 €)“ = echter verbleibender Kassenbestand nach Tageseffekten

### 7. Bargeldbestand-Summary korrigieren
`CashBalanceSummary` wird so angepasst, dass der angezeigte Wechselgeldbestand nicht mehr aus `pettyCash + cumulativeCash` kommt, sondern aus dem tatsächlich verbleibenden Bargeld nach Einzahlungen.

### 8. Datenaktualisierung sauber machen
Nach Änderungen an:

- Bankeinzahlungen
- Anfangsfehlbetrag
- Transfers

werden alle relevanten Queries gezielt invalidiert, damit keine alten Werte hängen bleiben.

## Prüfung nach Umsetzung
Für Spicery werden gezielt diese Daten geprüft:

- 31.03.2026
- 01.04.2026
- der im Screenshot gezeigte Tag

Dabei wird kontrolliert:

- 866 € Korrekturbuchung ist enthalten
- die historische Bankeinzahlung wirkt nur einmal und korrekt
- „Fehlbetrag Vortag“ passt rechnerisch
- „Differenz zum Wechselgeldbestand“ ist nicht mehr identisch mit einem falschen Kettenwert
- „Wechselgeldbestand“ entspricht dem realen Kassenbestand

## Technische Details
Betroffene Stellen:

- `supabase/migrations/...` für die korrigierte Bargeldfunktion
- `src/hooks/useCashBalanceData.ts`
- `src/hooks/usePreviousDayDeficit.ts`
- `src/hooks/useRemainingCash.ts`
- `src/pages/DailySummary.tsx`
- `src/components/daily-summary/layouts/ExcelLayout.tsx`
- `src/pages/CashBalance.tsx`
- `src/components/cash-balance/CashBalanceSummary.tsx`

## Erwartetes Ergebnis
Nach der Korrektur zeigen beide Seiten dieselben, plausiblen Bargeldwerte. Der Fehlbetrag vom Vortag läuft korrekt weiter, Bankeinzahlungen werden sauber abgezogen, und der Wechselgeldbestand zeigt wieder den echten Kassenstand statt eines Formelfehlers.
