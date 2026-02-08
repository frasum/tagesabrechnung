
## Korrektur der Trinkgeld-Prozentberechnungen

### Zusammenfassung des Problems
Die **TG %** (Trinkgeld-Prozent) Berechnung in der Kellner-Abrechnungstabelle stimmt nicht, besonders bei Team-Schichten (zwei Kellner auf einer Kasse).

### Aktueller Fehler

Im Screenshot sehen wir:
- Erste Zeile: **113,14 € × 2** (Team-Schicht) zeigt **5.3%** TG und **10.6%** Ø TG
- Zweite Zeile: **113,14 €** (Einzelschicht) zeigt **5.2%** TG und **5.2%** Ø TG

**Problem:** Bei der Team-Schicht wird `TG %` mit nur einem Anteil (113,14 €) durch den gesamten Schicht-Umsatz berechnet - das ergibt einen niedrigeren Prozentsatz als korrekt wäre.

### Korrekte Berechnung

| Schicht-Typ | Aktuell | Korrekt |
|-------------|---------|---------|
| **Einzelschicht** | `tipPerWaiter / pos_sales` | ✓ Richtig |
| **Team-Schicht** | `tipPerWaiter / pos_sales` ❌ | `tipPerWaiter / (pos_sales / 2)` ✓ |

Bei einer Team-Schicht sollte der **persönliche Anteil** mit dem **persönlichen Umsatzanteil** verglichen werden (50/50 Aufteilung).

### Beispiel

Angenommen eine Team-Schicht mit:
- `pos_sales` = 4.280 € (gesamte Schicht)
- `tipPerWaiter` = 113,14 € (pro Person)

**Aktuell (falsch):**
```
TG % = 113,14 € / 4.280 € = 2.6%
```

**Korrekt:**
```
TG % = 113,14 € / (4.280 € / 2) = 113,14 € / 2.140 € = 5.3%
```

---

### Betroffene Datei

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `src/pages/WaiterCashUp.tsx` | 431 | Bei Team-Schichten den Umsatz durch 2 teilen |

---

### Technische Umsetzung

**Aktuell (Zeile 431):**
```typescript
const currentTipPercent = shift.pos_sales > 0 
  ? (shiftTipShare / shift.pos_sales) * 100 
  : 0;
```

**Neu:**
```typescript
// Bei Team-Schichten: persönlicher Umsatzanteil = pos_sales / 2
const personalSalesShare = shift.second_waiter_name 
  ? (shift.pos_sales || 0) / 2 
  : (shift.pos_sales || 0);
const currentTipPercent = personalSalesShare > 0 
  ? (shiftTipShare / personalSalesShare) * 100 
  : 0;
```

---

### Auswirkung

| Vorher | Nachher |
|--------|---------|
| Team-Schicht zeigt **halben** TG % | Team-Schicht zeigt **korrekten** TG % |
| TG % ≠ Ø TG % bei Team-Schichten | TG % und Ø TG % sind konsistent |

Die Durchschnittsberechnung (`Ø TG %`) in `useWaiterTipAverages` ist bereits korrekt implementiert (teilt den Umsatz bei Team-Schichten durch 2). Mit dieser Korrektur wird die aktuelle `TG %` Anzeige mit der Durchschnittsberechnung konsistent.

---

### Zusammenfassung

Eine einzige Codeänderung in `src/pages/WaiterCashUp.tsx` (Zeile 431), die bei Team-Schichten den persönlichen Umsatzanteil (pos_sales / 2) für die Prozentberechnung verwendet.
