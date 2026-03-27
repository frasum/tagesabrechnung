

# Plan: Excel-Export für die Batch-Brutto-Netto-Berechnung

## Übersicht
Ein "Excel Export"-Button neben dem Berechnen-Button, der die Batch-Ergebnisse als `.xlsx`-Datei herunterlädt — gruppiert nach Restaurant mit Zwischensummen und Gesamtsumme.

## Änderungen

### `src/components/zeiterfassung/BatchPayrollCalculation.tsx`

1. **Import**: `Download` Icon aus lucide-react, dynamischer Import von `xlsx`
2. **Neue Funktion `handleExcelExport`**:
   - Erstellt ein Worksheet mit denselben Spalten wie die Tabelle: Mitarbeiter, Perso-Nr, Abt., Stunden, €/h, Brutto, Netto, SFN, Auszahlung, AG-Kosten
   - Gruppiert nach Restaurant mit Restaurant-Überschriften und Zwischensummen pro Restaurant
   - Gesamtsumme am Ende
   - Spaltenbreiten passend gesetzt
   - Dateiname: `Brutto-Netto_{dateFrom}_{dateTo}.xlsx`
3. **UI**: Neuer Button "Excel Export" (mit Download-Icon) neben dem Badge-Bereich, nur sichtbar wenn `batchResults.length > 0`

## Technische Details
- Verwendet die bereits im Projekt vorhandene `xlsx`-Bibliothek (dynamischer Import wie in anderen Export-Dateien)
- Zahlenformatierung: Rohwerte in Excel (kein `formatCurrency`), damit Excel-Nutzer damit rechnen können
- Fehlerhandling mit Toast-Feedback (analog zu bestehenden Exporten)

