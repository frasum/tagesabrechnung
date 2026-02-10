

# Fix: POS-Differenz-Warnung korrigieren

## Problem
Die POS-Differenz-Warnung zeigt faelschlicherweise 134,40 EUR an, weil OrderSmart- und Wolt-Umsaetze zwar im Vectron-Gesamtumsatz (pos_total) enthalten sind, aber keinem Kellner zugeordnet werden. Aktuell wird nur Takeaway von der Differenz abgezogen, nicht aber OrderSmart und Wolt.

**Aktuelle Berechnung:**
```text
POS Differenz = pos_total - kellnerUmsatz - takeaway
             = 3.475,20 - 3.111,50 - 229,30 = 134,40 (FALSCH - Warnung erscheint)
```

**Korrekte Berechnung:**
```text
POS Differenz = pos_total - kellnerUmsatz - takeaway - ordersmart - wolt
             = 3.475,20 - 3.111,50 - 229,30 - 134,40 - 0 = 0,00 (RICHTIG - keine Warnung)
```

## Aenderungen

### 1. DailySummary.tsx
- Zeile 417/419/426/429: `posMismatch - formData.takeaway_total` ersetzen durch `posMismatch - formData.takeaway_total - formData.ordersmart_revenue - formData.wolt_revenue`

### 2. ManagerDashboard.tsx
- Zeile 273/275/282/285: Gleiche Korrektur wie in DailySummary

### 3. pdfExport.ts
- Zeile 119: `adjustedPosMismatch` ebenfalls um OrderSmart und Wolt korrigieren

## Ergebnis
Die POS-Differenz-Warnung erscheint nur noch bei echten Diskrepanzen, nicht bei korrekt erfassten Plattform-Umsaetzen.

