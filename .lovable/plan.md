

## Bug: Falsche Pool-Berechnung in `useMonthlyStaffTips.ts`

### Ursache

In `src/hooks/useMonthlyStaffTips.ts` (Zeile 111) wird der Session-Pool falsch berechnet:

```js
// FALSCH: differenz = pos_sales - card_total (erwartetes Bargeld)
const sessionPool = shiftsInSession.reduce((sum, s) => sum + (s.differenz || 0), 0);
```

`differenz` speichert den erwarteten Bargeldbetrag (pos_sales - card_total), **nicht** den Trinkgeldbeitrag. Die korrekte Formel (wie in `useStatistics.ts` und `WaiterCashUp.tsx`) ist:

```
contribution = cash_handed_in - (pos_sales + hilf_mahl - open_invoices - card_total) - kitchen_tip
```

### Nachweis mit den Daten vom 1. März

| Kellner | differenz (falsch) | Korrekter Beitrag |
|---------|-------------------|------------------|
| Ann     | 104,97 €          | 83,35 €          |
| Cherry  | 195,43 €          | 106,75 €         |
| Coco    | -183,42 €         | 137,56 €         |

- **Falscher Pool** (Summe differenz): 116,98 € ÷ 4 Anteile = **29,25 €** ← das sieht der User
- **Korrekter Pool**: 327,66 € ÷ 4 Anteile = **81,92 €** ← erwarteter Wert

### Zweites Problem (Zeile 120)

```js
if (waiterShareCount > 0 && sessionPool > 0) {
```

Bei negativem Pool wird gar nichts verteilt. In `useStatistics.ts` werden negative Pools korrekt verteilt. Dieses `> 0` muss entfernt werden, damit auch Sessions mit negativem Pool (z.B. wenn Kellner weniger abgeben als erwartet) korrekt berechnet werden.

### Fix in `src/hooks/useMonthlyStaffTips.ts`

1. **Zeile 111**: Pool-Berechnung durch die korrekte Formel ersetzen:
   ```js
   const sessionPool = shiftsInSession.reduce((sum, s) => {
     const expected = (s.pos_sales || 0) + (s.hilf_mahl || 0) - (s.open_invoices || 0) - (s.card_total || 0);
     return sum + ((s.cash_handed_in || 0) - expected - (s.kitchen_tip || 0));
   }, 0);
   ```

2. **Zeile 120**: `sessionPool > 0` entfernen, damit auch negative Pools verteilt werden:
   ```js
   if (waiterShareCount > 0) {
   ```

