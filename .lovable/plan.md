

# Plan: "Pro Küche" Zeile hinzufügen

## Ziel

Unter "Küche (2%)" eine Unterzeile hinzufügen, die analog zu "→ Pro Kellner (4)" funktioniert:

```
Trinkgeld
────────────────────────────────────
Küche (2%)                   133,69 €
  → Pro Küche (3)             44,56 €   ← NEU
Kellner Pool                 452,54 €
  → Pro Kellner (4)          113,14 €
────────────────────────────────────
Gesamt                       586,23 €
```

---

## Berechnung

### Anzahl Küchenmitarbeiter
Die Anzahl der **einzigartigen** Küchenmitarbeiter an diesem Abend wird aus den `kitchenShifts` ermittelt:

```typescript
const uniqueKitchenStaff = new Set(kitchenShifts.map(k => k.staff_name)).size;
```

### Trinkgeld pro Küchenmitarbeiter
Das Küchen-Trinkgeld wird **proportional nach Arbeitsstunden** verteilt. Die Durchschnittsberechnung zeigt, was jeder im Schnitt bekommt:

```typescript
const tipPerKitchen = uniqueKitchenStaff > 0 ? totalKitchenTip / uniqueKitchenStaff : 0;
```

**Hinweis:** Dies ist eine vereinfachte Durchschnittsdarstellung. Die tatsächliche Verteilung erfolgt stundenbasiert (wer mehr Stunden arbeitet, bekommt proportional mehr). Für die Übersicht wird hier der Durchschnitt angezeigt.

---

## Technische Änderungen

### Datei: `src/pages/DailySummary.tsx`

**1. Neue Berechnung hinzufügen** (nach Zeile ~198):
```typescript
// Kitchen tip per person (average)
const uniqueKitchenStaff = new Set(kitchenShifts.map(k => k.staff_name)).size;
const tipPerKitchen = uniqueKitchenStaff > 0 ? totalKitchenTip / uniqueKitchenStaff : 0;
```

**2. Neue Tabellenzeile hinzufügen** (nach Zeile 856):
```tsx
{uniqueKitchenStaff > 0 && (
  <TableRow>
    <TableCell className="py-2 pl-6 text-muted-foreground">
      → Pro Küche ({uniqueKitchenStaff})
    </TableCell>
    <TableCell className="text-right tabular-nums text-success py-2">
      {formatCurrency(tipPerKitchen)}
    </TableCell>
  </TableRow>
)}
```

---

## Erwartetes Ergebnis

| Zeile | Anzeige |
|-------|---------|
| Küche (2%) | 133,69 € |
| → Pro Küche (3) | 44,56 € |
| Kellner Pool | 452,54 € |
| → Pro Kellner (4) | 113,14 € |
| **Gesamt** | **586,23 €** |

Die Zahl in Klammern zeigt die Anzahl der Küchenmitarbeiter an diesem Abend.

