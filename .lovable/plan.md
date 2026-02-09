
# Gesamt-Trinkgeld-Prozentsatz auf Seite 2 anzeigen

## Aenderung

### Datei: `src/utils/pdfExport.ts`

Nach der Kellner-Tabelle (Zeile 279) wird eine Zusammenfassungszeile eingefuegt, die das Gesamttrinkgeld im Verhaeltnis zum Gesamtumsatz zeigt:

- **Gesamt-TG**: `data.totals.totalWaiterTip` (bereits verfuegbar)
- **Gesamt-Umsatz**: `data.totals.kellnerUmsatz` (bereits verfuegbar)
- **Prozentsatz**: `(totalWaiterTip / kellnerUmsatz) * 100`

Die Darstellung erfolgt als kurze Textzeile unterhalb der Tabelle, z.B.:

```
Ø Trinkgeld: 120,00 € von 3.500,00 € Umsatz = 3,4%
```

Technisch wird nach `y = (doc as any).lastAutoTable.finalY + 4` (Zeile 279) folgender Code eingefuegt:

```typescript
const totalTipPercent = data.totals.kellnerUmsatz > 0
  ? (data.totals.totalWaiterTip / data.totals.kellnerUmsatz) * 100
  : 0;
y += 4;
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.text(
  `Ø Trinkgeld: ${formatCurrency(data.totals.totalWaiterTip)} von ${formatCurrency(data.totals.kellnerUmsatz)} Umsatz = ${totalTipPercent.toFixed(1).replace('.', ',')}%`,
  tableMarginLeft + 2, y
);
```

Keine weiteren Dateien muessen geaendert werden, da alle benoetigten Werte bereits in `data.totals` vorhanden sind.
