

## Takeaway-Umsatz in der Umsatzentwicklung-Grafik

### Änderung

In `src/pages/Statistics.tsx` wird dem bestehenden AreaChart eine dritte Area `deliveryRevenue` (Name: "Takeaway") hinzugefügt:

1. Neuer `linearGradient` mit `chart-3` Farbe (neben den bestehenden für Umsatz und Bargeld)
2. Neue `<Area>` mit `dataKey="deliveryRevenue"` und Name "Takeaway"

Die Daten sind bereits vorhanden -- `chartData` enthält `deliveryRevenue` aus dem `useStatistics`-Hook. Es muss nur die visuelle Darstellung ergänzt werden.

### Datei

| Datei | Änderung |
|---|---|
| `src/pages/Statistics.tsx` | Dritte Area + Gradient für Takeaway-Umsatz im Umsatzentwicklung-Chart |

