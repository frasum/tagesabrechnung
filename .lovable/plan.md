

## Analyse: Fehlende YUM-Daten im Vergleich-Tab

### Problem gefunden

Die Datenbank enthält alle Daten korrekt. Das Problem liegt an der **Berechnung**, nicht an fehlenden Daten:

1. **Leere Session am 07.03.**: YUM hat eine Session am 07.03. mit `pos_total = 0` und ohne Kellner-Schichten. Diese leere Session wird trotzdem als "Tag mit Daten" gezählt, was den **Ø Tagesumsatz** nach unten verzerrt (÷7 statt ÷6).

2. **`totalRevenue` basiert auf `pos_sales` aus Kellner-Schichten**, nicht auf `pos_total` (Vectron-Kasse). Für YUM ergibt das 25.565 € statt 29.282 € (Vectron). Die Differenz (~3.716 €) sind Lieferumsätze und Takeaway, die separat unter "Lieferumsatz" gezählt werden. Das ist korrekt so, aber kann verwirrend wirken.

### Lösung

**`useStatistics.ts`**: Sessions ohne Kellner-Schichten aus der `dailyStats`-Berechnung und `daysWithData`-Zählung ausschließen.

```text
Vorher:  dailyStats = sessions.map(...)  → alle Sessions, auch leere
Nachher: dailyStats = sessions.map(...).filter(d => hat mindestens 1 Schicht)
```

Konkret:
- Nach der `dailyStats`-Berechnung (Zeile 150-192): leere Tage herausfiltern, bei denen `kellnerUmsatz === 0` UND keine Schichten existieren
- `summary.daysWithData` und `summary.avgDailyRevenue` basieren dann nur auf Tage mit tatsächlichen Daten
- Gleiche Logik in `useStatisticsComparison.ts` (Zeile 29-90): `daysWithData` nur Sessions zählen, die mindestens eine Schicht haben

### Betroffene Dateien
- `src/hooks/useStatistics.ts` — `dailyStats` filtern
- `src/hooks/useStatisticsComparison.ts` — `daysWithData` Berechnung anpassen

