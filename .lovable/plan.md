

# TG% bei Team-Schichten auf Gesamtumsatz berechnen

## Problem

Bei Team-Schichten wird die Trinkgeld-Prozentanzeige aktuell auf den halbierten Umsatz (pos_sales / 2) berechnet. Das fuehrt zu unrealistisch hohen Prozentwerten, weil jeder seinen vollen Anteil gegen nur die Haelfte des Umsatzes gerechnet bekommt.

## Loesung

Die TG%-Berechnung fuer Team-Schichten soll den **vollen Schicht-Umsatz** (pos_sales) als Basis verwenden, nicht den halbierten.

```text
VORHER (halbierter Umsatz als Basis):
| Europe | 53,17 EUR | 87,83 EUR | 21.5% | 13.0% |
| Andi   | 53,17 EUR | 87,83 EUR | 21.5% | 12.5% |

NACHHER (voller Umsatz als Basis):
| Europe | 53,17 EUR | 87,83 EUR | 10.7% | 13.0% |
| Andi   | 53,17 EUR | 87,83 EUR | 10.7% | 12.5% |
```

## Technische Aenderung

### Datei: `src/pages/WaiterCashUp.tsx` (Zeilen 457-462)

Nur eine kleine Aenderung: `personalSalesShare` fuer Team-Schichten soll den vollen `pos_sales` verwenden statt `pos_sales / 2`:

```typescript
// VORHER:
const personalSalesShare = isTeam
  ? (shift.pos_sales || 0) / 2
  : (shift.pos_sales || 0);

// NACHHER:
const personalSalesShare = shift.pos_sales || 0;
```

Da `personalSalesShare` nur fuer die TG%-Anzeige verwendet wird und der Beitrag separat berechnet wird, hat diese Aenderung keine Auswirkung auf andere Berechnungen. Alle anderen Spalten (Beitrag, Anteil, Ø TG%) bleiben unveraendert.
