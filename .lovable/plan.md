

# Fix: Takeaway-Umsatz fehlt in der BARGELD-Berechnung

## Problem
`takeaway_total` ist im Vectron-Gesamtumsatz (`pos_total`) enthalten, wird aber aktuell **nicht** von der BARGELD-Berechnung abgezogen. Da Takeaway-Umsaetze nicht als Bargeld in der Kasse landen, fuehrt das zu einem ueberhoeht berechneten Bargeld-Soll. Die Differenz von -290,93 EUR ergibt sich genau aus diesem fehlenden Abzug.

## Loesung
`- takeaway_total` an allen 5 Berechnungsstellen einfuegen.

**Korrigierte Formel:**
```text
BARGELD = pos_total + GutscheineVK
          - Kreditkarten
          - OrderSmart
          - Wolt
          - Takeaway        <-- NEU
          - GutscheineEL
          - FineDine
          - Einladung
          - OffeneRE
          - Vorschuss
          - Ausgaben
          + Fehlbetrag Vortag
```

## Aenderungen (5 Dateien)

### 1. `src/pages/DailySummary.tsx` (Zeile ~271)
`- formData.takeaway_total` nach `formData.wolt_revenue` einfuegen

### 2. `src/pages/ManagerDashboard.tsx` (Zeile ~237)
`- formData.takeaway_total` nach `formData.wolt_revenue` einfuegen

### 3. `src/hooks/useCashBalanceData.ts` (Zeile ~68)
Variable `takeaway` aus Session lesen (`session.takeaway_total || 0`) und `- takeaway` in die Formel einfuegen

### 4. `src/hooks/usePreviousDayDeficit.ts` (Zeile ~65)
Variable `takeaway` aus Session lesen und `- takeaway` in die Formel einfuegen

### 5. `src/hooks/useStatistics.ts` (Zeile ~149)
`- (session.takeaway_total || 0)` in die Formel einfuegen

## Was sich NICHT aendert
- Eingabefelder und Anzeige bleiben unveraendert
- Datenbank-Speicherung bleibt unveraendert
- Statistiken und Delivery-Breakdown bleiben unveraendert
- Nur die mathematische BARGELD-Formel wird korrigiert
