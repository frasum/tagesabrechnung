

# SoUse nicht in Vectron Takeaway (Restaurant-spezifische Einstellung)

## Problem
Bei **YUM** ist der SoUse (OrderSmart)-Umsatz **nicht** im Vectron Takeaway-Total enthalten, bei **Spicery** jedoch schon. Das aktuelle System geht davon aus, dass OrderSmart bereits im Takeaway enthalten ist, weshalb es in der **POS-Differenz-Berechnung** nicht separat abgezogen wird.

Das fuehrt dazu, dass die POS-Differenz bei YUM falsch berechnet wird, sobald OrderSmart-Umsaetze vorhanden sind.

## Loesung
Eine neue Einstellung pro Restaurant: `ordersmart_in_takeaway` (Boolean). 

- **true** (Standard/Spicery): OrderSmart ist im Takeaway enthalten, wird nicht separat abgezogen
- **false** (YUM): OrderSmart ist NICHT im Takeaway enthalten, muss in der POS-Differenz separat abgezogen werden

## Betroffene Stellen

### 1. Datenbank
- Neue Spalte `ordersmart_in_takeaway` (boolean, default `true`) in der `restaurants`-Tabelle

### 2. POS-Differenz-Berechnung
Die Formel `adjustedPosDiff = posMismatch - takeaway_total` muss erweitert werden:

```text
Wenn ordersmart_in_takeaway = false:
  adjustedPosDiff = pos_total - kellnerUmsatz - takeaway_total - ordersmart_revenue

Wenn ordersmart_in_takeaway = true (bisheriges Verhalten):
  adjustedPosDiff = pos_total - kellnerUmsatz - takeaway_total
```

Betroffene Dateien:
- `src/pages/DailySummary.tsx` (Zeile 443)
- `src/pages/ManagerDashboard.tsx` (Zeile 274)
- `src/utils/pdfExport.ts` (Zeile 130)

### 3. Restaurant-Daten laden
- Die Restaurant-Einstellung muss geladen und an die betroffenen Komponenten weitergegeben werden (ueber den bestehenden RestaurantContext oder useSettings)

### 4. Kein Einfluss auf BARGELD
Die BARGELD-Formel in `useCashBalanceData.ts` zieht OrderSmart bereits separat ab -- dort aendert sich nichts.

## Technische Schritte

1. **Migration**: Spalte `ordersmart_in_takeaway` (boolean, default true) zur `restaurants`-Tabelle hinzufuegen. Fuer YUM auf `false` setzen.
2. **Restaurant-Kontext erweitern**: Die neue Einstellung im RestaurantContext oder beim Laden der Session verfuegbar machen.
3. **POS-Differenz anpassen**: In DailySummary, ManagerDashboard und pdfExport die Formel konditional erweitern.
4. **Optional**: Einstellung in den Restaurant-Settings im UI konfigurierbar machen.
