

## Plan: Umfassender Restaurant-Vergleich (Yum vs. Spice Tree)

Der bestehende "Vergleich"-Tab zeigt aktuell nur eine einfache Kennzahlen-Tabelle. Dieser wird zu einem vollwertigen Vergleichs-Dashboard ausgebaut.

### 1. Dashboard-Karten (oben)
Vier StatCards im Compare-Modus ersetzen die normalen Summary-Karten. Jede Karte zeigt **beide Restaurant-Werte** und die **Differenz**:
- Gesamtumsatz (Yum vs. Spice Tree, %-Differenz)
- Ø Tagesumsatz
- Gesamt Trinkgeld
- Lieferumsatz

**Umsetzung:** In `Statistics.tsx` im Block `statsMode === 'compare'` eigene Karten rendern, die `dataA.summary` und `dataB.summary` nebeneinander zeigen.

### 2. Erweiterte Vergleichstabelle
Die bestehende `RestaurantComparison`-Komponente wird erweitert:
- **Fortschrittsbalken** pro Zeile: proportionale farbige Balken zeigen visuell, welches Restaurant führt
- **Differenz-Spalte**: absolute und prozentuale Differenz mit Trend-Icons (wie in `PeriodComparison`)
- **Zusätzliche Kennzahlen**: Ø Trinkgeld pro Tag, Ø Ausgaben pro Tag

### 3. Overlay-Chart (Umsatzentwicklung)
Ein neues `RestaurantOverlayChart`-Komponente zeigt beide Restaurants als **Linien im selben Chart**:
- X-Achse: Datum
- Linie 1 (chart-1 Farbe): Yum Tagesumsatz
- Linie 2 (chart-2 Farbe): Spice Tree Tagesumsatz
- Gemeinsame Tooltip mit beiden Werten

**Datenquelle:** `dataA.dailyStats` und `dataB.dailyStats` werden per Datum gemerged.

### 4. Nebeneinander-Charts (Trinkgeld)
Zwei Charts im `grid lg:grid-cols-2` Layout:
- Links: Yum Trinkgeld-Verteilung (Küche + Service gestapelt)
- Rechts: Spice Tree Trinkgeld-Verteilung

### Dateien

| Datei | Änderung |
|---|---|
| `src/components/statistics/RestaurantComparison.tsx` | Erweitern: Fortschrittsbalken, Differenz-Spalte, neue Kennzahlen |
| `src/components/statistics/RestaurantOverlayChart.tsx` | **Neu**: Overlay-LineChart beider Restaurants |
| `src/components/statistics/RestaurantCompareCards.tsx` | **Neu**: Vier Dashboard-Karten mit Vergleichswerten |
| `src/pages/Statistics.tsx` | Compare-Modus: neue Komponenten einbinden, Nebeneinander-Trinkgeld-Charts, `dailyStats` an Overlay-Chart übergeben |

### Datenfluss
Die bestehenden `dataA` und `dataB` Hooks (Zeilen 126-127) liefern bereits alle benötigten Daten pro Restaurant. Keine DB-Änderungen nötig.

