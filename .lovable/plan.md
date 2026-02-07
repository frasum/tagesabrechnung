
# Plan: Trinkgeld Pool Card Höhe optimieren

## Problem

Die Trinkgeld Pool Card hat derzeit bei wenigen Kellnern (2) viel ungenutzten weißen Raum unten. Die Card soll so dimensioniert sein, dass sie visuell für bis zu 6 Kellner ausgelegt ist.

## Lösung

Die Tabelle innerhalb der Card erhält eine Mindesthöhe, sodass Platz für ca. 6 Kellner-Einträge reserviert ist. Das verhindert, dass die Card bei wenigen Kellnern zu leer wirkt und gewährleistet ein konsistentes Layout.

---

## Technische Umsetzung

### Datei: `src/pages/WaiterCashUp.tsx`

**Änderung an der Tabelle (Zeile 281):**

Die Tabelle wird in einen Container mit Mindesthöhe gewickelt:

```tsx
{/* Pool Breakdown Table */}
<div className="min-h-[280px]">
  <Table>
    ...
  </Table>
</div>
```

**Berechnung der Mindesthöhe:**
- Jede Tabellenzeile: ca. 48px
- 6 Kellner + 1 Gesamt-Zeile = 7 Zeilen
- Header-Zeile: ca. 40px
- Gesamt: ~280px Mindesthöhe

---

## Ergebnis

- Bei wenigen Kellnern (1-2): Card hat gleichmäßige Größe, kein übermäßiger Leerraum
- Bei vielen Kellnern (4-6): Tabelle wächst natürlich mit
- Konsistentes Layout zwischen beiden Cards (Formular links, Pool rechts)
