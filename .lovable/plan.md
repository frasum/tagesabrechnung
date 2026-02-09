
# Kellner-Details im PDF-Export ergaenzen

## Uebersicht
Unterhalb der bestehenden Zusammenfassung (nach "ohne hilfmahl" und Ausgaben) wird eine neue Tabelle mit Kellner-Details eingefuegt:
- **Name** des Kellners
- **Umsatz** (pos_sales)
- **Abgabezeit** (submitted_at)
- **TG %** (Trinkgeld-Prozentsatz vom Umsatz)

## Aenderungen

### 1. WaiterShift-Interface erweitern (`src/utils/pdfExport.ts`)
Zwei neue Felder hinzufuegen:
- `submitted_at?: string | null` - Zeitpunkt der Abgabe
- `participates_in_pool?: boolean` - ob am TG-Pool teilgenommen wird
- `second_waiter_name?: string | null` - fuer korrekte Anteilsberechnung

### 2. Neue Kellner-Tabelle im PDF (`src/utils/pdfExport.ts`)
Nach dem Ausgaben-Block eine neue autoTable-Tabelle einfuegen:

| Kellner | Umsatz | Abgabe | TG % |
|---------|--------|--------|------|
| Max     | 1.234 EUR | 14:32 | 3,2% |
| Anna    | 987 EUR   | 15:10 | 4,1% |

**TG % Berechnung:**
```
tipPerWaiter = totalWaiterTip / Anzahl Pool-Teilnehmer
shares = second_waiter_name ? 2 : 1
waiterPoolShare = participates_in_pool ? tipPerWaiter * shares : 0
tipPercent = posSales > 0 ? (waiterPoolShare / posSales) * 100 : null
```

### 3. Daten beim Export uebergeben (`src/pages/DailySummary.tsx`)
Die `waiterShifts`-Mapping um `submitted_at`, `participates_in_pool` und `second_waiter_name` erweitern.

### 4. totalWaiterTip an PDFExportData uebergeben
Wird bereits in `totals.totalWaiterTip` uebergeben - wird fuer die TG%-Berechnung in der PDF-Funktion genutzt.

## Technische Details

**Dateien:**
- `src/utils/pdfExport.ts` - Interface erweitern + neue Tabelle nach Ausgaben
- `src/pages/DailySummary.tsx` - `submitted_at`, `participates_in_pool`, `second_waiter_name` im Mapping ergaenzen

**Layout im PDF:**
Die Kellner-Tabelle wird zentriert mit gleicher Breite wie die Haupttabelle dargestellt, mit Header-Zeile in Grau und kompakter Schrift (8pt).
