

# Differenz-Berechnung korrigieren

## Problem

Die Zeile "Differenz" zeigt aktuell `pos_total - kellnerUmsatz` an (= 7168,70 - 6684,50 = 484,20). Der Takeaway-Umsatz (484,20) wird zwar bei der **Warnung** abgezogen, aber nicht beim **angezeigten Wert**.

## Loesung

In `src/components/daily-summary/layouts/ExcelLayout.tsx` (Zeile 112):

**Vorher:**
```
value={formData.pos_total - kellnerUmsatz}
```

**Nachher:**
```
value={formData.pos_total - kellnerUmsatz - formData.takeaway_total}
```

Damit zeigt die Differenz 0,00 an, wenn POS-Umsatz = Kellner-Umsatz + Takeaway.

## Dateiaenderung

| Datei | Aenderung |
|-------|-----------|
| `src/components/daily-summary/layouts/ExcelLayout.tsx` | Zeile 112: Takeaway vom Differenz-Wert abziehen |

