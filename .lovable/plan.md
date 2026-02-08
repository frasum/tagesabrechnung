
## Formelkorrektur: Takeaway Gesamt zu „Kellner Abzugebender Betrag" addieren

### Zusammenfassung
Das Feld **„Kellner Abzugebender Betrag"** (schreibgeschützt, im POS & Terminal-Bereich) zeigt aktuell nur die Summe der `kassiert_brutto`-Werte aller Kellner-Schichten. Dieser Wert soll um den **Takeaway-Gesamtumsatz** erweitert werden:

```
Kellner Abzugebender Betrag = Summe(kassiert_brutto) + Takeaway Gesamt
```

Wobei **Takeaway Gesamt** = Takeaway GL + OrderSmart + Wolt

### Begründung
Bei Takeaway-Bestellungen (ob Karte oder Bar) wird der Umsatz zwar an der Kasse erfasst, aber nicht direkt einem Kellner zugeordnet. Damit der Manager beim Abgleich einen vollständigen Überblick hat, wie viel insgesamt abgerechnet wurde, muss dieser Betrag zum abzugebenden Betrag hinzugerechnet werden.

### Auswirkung

| Vorher | Nachher |
|--------|---------|
| Kellner Abzugebender Betrag = `1.000 €` (nur Kellner) | Kellner Abzugebender Betrag = `1.000 € + 482 € = 1.482 €` |

### Betroffene Datei

| Datei | Änderung |
|-------|----------|
| `src/pages/ManagerDashboard.tsx` | Zeile 211 und 470: `totalKassiertBrutto` um `totalDeliveryRevenue` erweitern |

---

### Technische Umsetzung

**Aktuell (Zeile 211):**
```typescript
const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0);
```

**Neu:**
```typescript
const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0)
  + formData.ordersmart_revenue
  + formData.wolt_revenue
  + formData.takeaway_total;
```

Alternativ kann die bestehende `totalDeliveryRevenue`-Variable verwendet werden:

```typescript
const totalDeliveryRevenue = 
  formData.ordersmart_revenue +
  formData.wolt_revenue +
  formData.takeaway_total;

const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0)
  + totalDeliveryRevenue;
```

Da `totalDeliveryRevenue` erst nach `totalKassiertBrutto` definiert wird (Zeile 220), muss entweder:
1. Die Definition von `totalDeliveryRevenue` nach oben verschoben werden, oder
2. Die Takeaway-Werte direkt in `totalKassiertBrutto` addiert werden

**Gewählter Ansatz:** Die Takeaway-Werte direkt in `totalKassiertBrutto` addieren, um die bestehende Code-Struktur minimal zu verändern.

---

### UI-Änderung

Das Feld bleibt optisch identisch (schreibgeschützt, grauer Hintergrund). Lediglich der angezeigte Wert ändert sich:

| Label | Vorher | Nachher |
|-------|--------|---------|
| Kellner Abzugebender Betrag | Nur Kellner-Summe | Kellner-Summe + Takeaway Gesamt |

Optional könnte das Label angepasst werden zu „Abzugebender Betrag" oder ein Tooltip hinzugefügt werden, der die Zusammensetzung erklärt.

---

### Was bleibt unverändert

- Die BARGELD-Berechnung (bleibt wie bisher)
- Die POS-Differenz-Warnung (vergleicht weiterhin `pos_total` mit `kellnerUmsatz`, nicht mit `totalKassiertBrutto`)
- Die Terminal-Differenz-Warnung
- Die Statistiken und Export-Dateien

---

### Zusammenfassung der Code-Änderung

Nur **eine Zeile** in `src/pages/ManagerDashboard.tsx` wird geändert (Zeile 211):

```typescript
// VORHER:
const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0);

// NACHHER:
const totalKassiertBrutto = waiterShifts.reduce((sum, w) => sum + (w.kassiert_brutto || 0), 0)
  + formData.ordersmart_revenue
  + formData.wolt_revenue
  + formData.takeaway_total;
```
