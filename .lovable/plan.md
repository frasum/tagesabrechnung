
# Trinkgeld-Ranking: Umstellung auf individuelles Trinkgeld

## Aktuelles System

Die Ranking-Berechnung in `useWaiterRanking.ts` basiert derzeit auf einem **gleichmäßigen Pool-Verteilungssystem**:

1. Der gesamte Trinkgeld-Pool wird aus allen Kellner-Beiträgen berechnet
2. Der Pool wird **gleichmäßig** auf alle Kellner verteilt (= `sharePerWaiter`)
3. Die Ranking-Position basiert auf `tipPercent = (sharePerWaiter / pos_sales) * 100`

**Problem**: Jeder Kellner erhält den gleichen Trinkgeldbetrag pro Schicht, unabhängig davon, wie viel er tatsächlich verdient hat.

## Gewünschtes System

Das Ranking soll statt auf dem gleichmäßigen Anteil auf dem **tatsächlichen individuellen Trinkgeldbeitrag** basieren:

```
Individuelles Trinkgeld = cash_handed_in - expected - kitchen_tip

Wo:
- expected = pos_sales + hilf_mahl - open_invoices - card_total
- kitchen_tip = Küchen-Trinkgeld (normalerweise 2% vom Umsatz)
```

Dies entspricht exakt der `calculateContribution()`-Logik aus `WaiterCashUp.tsx`.

## Implementierung

### Dateiänderung: `src/hooks/useWaiterRanking.ts`

**Schritt 1**: Im Abschnitt "Calculate tip percent for each waiter in each session" (Zeilen 69-79):

Aktuell:
```typescript
for (const shift of sessionShifts) {
  const name = shift.waiter_name;
  const sales = shift.pos_sales || 0;
  const tipPercent = sales > 0 ? (sharePerWaiter / sales) * 100 : 0;
  ...
}
```

Neu:
```typescript
for (const shift of sessionShifts) {
  const name = shift.waiter_name;
  const sales = shift.pos_sales || 0;
  
  // Berechne individuellen Trinkgeld-Beitrag (statt Pool-Anteil)
  const expected = (shift.pos_sales || 0) + (shift.hilf_mahl || 0) 
                   - (shift.open_invoices || 0) - (shift.card_total || 0);
  const individualTip = (shift.cash_handed_in || 0) - expected - (shift.kitchen_tip || 0);
  
  // Trinkgeld-Prozentsatz basiert auf individuellem Trinkgeld
  const tipPercent = sales > 0 ? (individualTip / sales) * 100 : 0;
  ...
}
```

**Auswirkungen**:
- Kellner mit höheren individuellen Trinkgeldbeiträgen erhalten bessere Rankings
- Die Trend-Berechnung bleibt unverändert (relativ Vergleich recent vs. older)
- Die Anzeige in der UI (`avgTipPercent`) zeigt nun den durchschnittlichen Prozentsatz des individuellen Trinkgelds

### UI-Auswirkungen

Keine Änderungen in `TipRanking.tsx` erforderlich – die Komponente zeigt weiterhin `avgTipPercent` an, aber jetzt basiert dieser auf den individuellen Beiträgen statt dem Pool.

### Memory-Update

Die Memory zu "reconciliation/tip-system" sollte aktualisiert werden:
- **Alt**: "Trinkgeld-Berechnung basiert auf dem Systemumsatz zur Gewährleistung der Konsistenz"
- **Neu**: "Trinkgeld-Ranking basiert auf dem tatsächlichen individuellen Trinkgeldbeitrag pro Kellner, berechnet als (cash_handed_in - expected - kitchen_tip) / pos_sales. Dies spiegelt die tatsächliche Performance wider."

## Betroffene Dateien

| Datei | Änderung |
|-------|-----------|
| `src/hooks/useWaiterRanking.ts` | Umstellung von `sharePerWaiter` auf `individualTip` in der Berechnung (Zeilen 69-79) |

## Technische Details

- **Keine DB-Änderungen** erforderlich
- **Keine Typ-Änderungen** erforderlich
- Die Berechnung folgt exakt der bewährten Logik aus `WaiterCashUp.tsx`
- Team-Schichten: Jeder Kellner wird mit seinem individuellen Beitrag berücksichtigt (nicht geteilt)
