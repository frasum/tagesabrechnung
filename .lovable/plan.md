
# Plan: Trinkgeld-Prozent Kachel hinzufuegen

## Uebersicht

Hinzufuegen einer vierten StatCard in der oberen Statistik-Leiste, die den prozentualen Anteil des Gesamttrinkgeldes am Tagesumsatz anzeigt.

---

## Berechnung

**Formel:**
```
Trinkgeld % = (Kellner-Pool + Kuechen-Pool) / Gesamtumsatz * 100
```

**Beispiel aus Screenshot:**
- Kellner TG Pool: 210,00 EUR
- Kuechen TG Pool: 40,00 EUR
- Gesamt-Trinkgeld: 250,00 EUR
- Bei Umsatz von 5.000 EUR: 5,0%

---

## Darstellung

Die vierte Kachel zeigt:

| Label | Wert | Icon |
|-------|------|------|
| Trinkgeld % | 5,0 % | Percent-Icon |

**Farbcodierung:**
- Gruen (success): Standardfarbe fuer Trinkgeld-Prozent
- Fallback bei 0 Umsatz: "0,0 %" anzeigen (Division durch Null vermeiden)

---

## Aenderungen

### Datei: `src/pages/WaiterCashUp.tsx`

**1. Import erweitern (Zeile 3):**
- `Percent` Icon von lucide-react hinzufuegen

**2. Berechnung hinzufuegen (nach Zeile 130):**
```typescript
const totalSales = waiterShifts.reduce((sum, s) => sum + s.pos_sales, 0);
const totalTip = totalPool + totalKitchenTip;
const tipPercentage = totalSales > 0 ? (totalTip / totalSales) * 100 : 0;
```

**3. Vierte StatCard hinzufuegen (Zeile 178, nach Kuechen TG Pool):**
```tsx
<StatCard 
  label="Trinkgeld %" 
  value={`${tipPercentage.toFixed(1)} %`} 
  icon={<Percent className="w-5 h-5" />} 
  variant="success" 
/>
```

---

## Ergebnis

Die Statistik-Leiste zeigt dann 4 Kacheln:

```
+------------------+------------------+------------------+------------------+
| Kellner TG Pool  | Pro Kellner (X)  | Kuechen TG Pool  | Trinkgeld %      |
| 210,00 EUR       | 210,00 EUR       | 40,00 EUR        | 5,0 %            |
+------------------+------------------+------------------+------------------+
```

Das Grid ist bereits auf `lg:grid-cols-4` eingestellt, also passt die vierte Kachel perfekt ins Layout.
