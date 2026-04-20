

# Bug: „Übertrag aus Vormonat" zeigt 10.228,43 € statt −141,00 €

## Ursache

In `src/pages/CashBalance.tsx` (Zeilen 70–81) wird der Übertrag **selbst neu berechnet**, statt den korrekten Wert aus der DB-Funktion `compute_carry_over` zu verwenden:

```ts
const priorCash = data
  .filter((row) => row.date < monthStart)
  .reduce((sum, row) => sum + (row.rawBargeld ?? row.bargeld), 0);
const priorDeposits = (deposits || [])
  .filter((d) => d.deposit_date < monthStart)
  .reduce((sum, d) => sum + d.amount, 0);
return priorCash - priorDeposits;
```

Diese Berechnung ist aus zwei Gründen falsch:

1. **Fehlender historischer Übertrag vor dem Datenfenster**: `useCashBalanceData` lädt Sessions nur für die letzten 6 Monate (ab 20.10.2025). Der Übertrag, der sich vor diesem Fenster angesammelt hat (z. B. die −141 € aus der Korrekturbuchung am 31.03.2026 sowie alle früheren Sessions/Transfers/Deposits), fließt nicht ein.
2. **Bei YUM existieren 0 Bankeinzahlungen** in `bank_deposits` (alles wurde historisch über `register_transfers` abgewickelt). Dadurch wird das gesamte aufgelaufene Bargeld der Sessions seit Februar 2026 (~10.228 €) als „Übertrag" angezeigt, obwohl es regelmäßig physisch in den Tresor/zur Bank gebracht wurde.

Die korrekte serverseitige Funktion `compute_carry_over('YUM', '2026-04-01')` liefert dagegen genau **−141,00 €** – das ist der wahre Wert.

## Fix

**Datei:** `src/pages/CashBalance.tsx`

`previousMonthCarryOver` nicht länger im Frontend aus `data`/`deposits` berechnen, sondern direkt per RPC `compute_carry_over` ermitteln (genau dieselbe Funktion, die bereits in `useCashBalanceData` für den Tageswert verwendet wird).

### Konkret

1. Neuer Hook-Aufruf in `CashBalance.tsx`:
   ```ts
   const { data: carryOver = 0 } = useQuery({
     queryKey: ['cash-carry-over', restaurantId, selectedMonth],
     queryFn: async () => {
       const { data, error } = await supabase.rpc('compute_carry_over', {
         p_restaurant_id: restaurantId,
         p_before_date: `${selectedMonth}-01`,
       });
       if (error) throw error;
       return Number(data) || 0;
     },
     enabled: !!restaurantId && !!selectedMonth,
   });
   ```
2. Den bisherigen `previousMonthCarryOver`-`useMemo`-Block (Zeilen 70–81) entfernen.
3. Übergabe an `<CashBalanceSummary>` (Zeilen 197–198) auf `carryOver` umstellen.

## Ergebnis

YUM zeigt im April **−141,00 €** als „Übertrag aus Vormonat" (statt 10.228,43 €). Spicery und alle anderen Restaurants bleiben korrekt, weil dort nun ebenfalls die autoritative DB-Funktion verwendet wird – die alle historischen Sessions, Bankeinzahlungen und Tresor-Transfers vollständig berücksichtigt, unabhängig vom 6-Monats-Ladefenster.

## Keine weiteren Änderungen
- Keine DB-Migration
- Keine Logikänderung der Tageszeilen oder von „Gesamt verfügbar"

