

## Kassenstand-Logik: Vereinfachung auf Tagesbasis + Transfers

### Dein Szenario verstanden
**Ausgangssituation pro Tag:**
- Restaurant-Kasse startet mit **1.000 €** (Anfangsbestand)
- Vault startet mit **1.000 €** (Anfangsbestand)
- **Bargeld des Tages** wird berechnet (können positiv oder negativ sein)
- **Kassenstand Ende des Tages** = 1.000 € + Bargeld des Tages + ggf. Transfers vom Tresor

**Wenn Kassenstand < 1.000 € geht (also Bargeld < 0):**
- Manager sieht Transfer-Button "Transfer vom Tresor"
- Manager kann Betrag eingeben und Transfer erfassen
- Dieser Transfer wird in `register_transfers` mit `direction = 'to_restaurant'` gespeichert
- Der neue Kassenstand wird sofort aktualisiert

### Was ändert sich in DailySummary.tsx

**Zeile 100-132 (Cumulative cash balance calculations) - ENTFERNEN:**
- Die komplexe Logik mit `previousDayCumulativeCash` ist nicht mehr nötig
- Die Berechnung mit `registerBalanceBeforeToday` ist nicht mehr nötig
- `hadDeficitBefore`, `deficitWasCleared`, `amountCleared`, `isPartialClearance` sind nicht mehr nötig

**Neue vereinfachte Logik (Zeile 99-120 ersetzen):**
```typescript
// Vereinfacht: Nur heutiger Tag
const initialRestaurantBalance = balances.initialRestaurant; // 1.000 €
const todaysVaultTransfers = useMemo(() => {
  return transfers
    .filter(t => t.direction === 'to_restaurant' && t.transfer_date === selectedDateStr)
    .reduce((sum, t) => sum + t.amount, 0);
}, [transfers, selectedDateStr]);

const todaysRegisterBalance = initialRestaurantBalance + bargeld + todaysVaultTransfers;
const showCashBalanceCard = todaysRegisterBalance < initialRestaurantBalance; // nur zeigen wenn < 1.000 €
```

**Zeile 284-334 (Kassenstand Card) - VEREINFACHEN:**
```tsx
{showCashBalanceCard && (
  <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Banknote className="w-5 h-5" />
        Kassenstand
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* Anfangsbestand */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Anfangsbestand</span>
        <span className="font-semibold tabular-nums">
          {formatCurrency(initialRestaurantBalance)}
        </span>
      </div>

      {/* Bargeld heute */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Bargeld heute</span>
        <span className={`font-semibold tabular-nums ${bargeld >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
          {formatCurrency(bargeld)}
        </span>
      </div>

      {/* Transfer vom Tresor heute */}
      {todaysVaultTransfers > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Transfer Tresor</span>
          <span className="font-semibold tabular-nums text-blue-600">
            +{formatCurrency(todaysVaultTransfers)}
          </span>
        </div>
      )}

      <Separator />

      {/* Kassenstand Ende des Tages */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Kassenstand</span>
        <span className={`text-lg font-bold tabular-nums ${todaysRegisterBalance >= initialRestaurantBalance ? 'text-emerald-600' : 'text-destructive'}`}>
          {formatCurrency(todaysRegisterBalance)}
        </span>
      </div>

      {/* Transfer-Button nur wenn noch unter 1.000 € */}
      {todaysRegisterBalance < initialRestaurantBalance && (
        <Button 
          onClick={() => setShowTransferDialog(true)} 
          variant="outline" 
          className="w-full gap-2"
        >
          <Vault className="w-4 h-4" />
          Transfer vom Tresor
        </Button>
      )}
    </CardContent>
  </Card>
)}
```

**Imports - ANPASSEN (Zeile 1-26):**
- Behalte: `useRegisterTransfers`, `TransferDialog`
- Entfernen: `useCashBalanceData` (wird nicht mehr genutzt)
- Entfernen: `CheckCircle2`, `AlertTriangle` (sind nicht mehr nötig)

### Wie das in ManagerDashboard.tsx weiterlebt

Die ManagerDashboard.tsx hat bereits die kumulierte Defizit-Ausgleich-Logik. Das bleibt dort wie es ist – das ist ein separates Konzept für den Manager-Überblick. Nur in der DailySummary.tsx wird es vereinfacht auf Tagesbasis.

### Zusammenfassung der Änderungen

| Was | Vorher | Nachher |
|-----|--------|---------|
| **DailySummary Kassenstand** | Kumuliert über alle Tage | Nur heutiger Tag (1.000 € + Bargeld + Transfers) |
| **Wann wird Kachel angezeigt** | Immer (wenn Session existiert) | Nur wenn Kassenstand < 1.000 € |
| **Defizit-Ausgleich-Logik** | Komplexe Berechnung (`hadDeficitBefore`, etc.) | Einfach: nur heute's Transfers zeigen |
| **Transfer-Button** | Nur bei kumuliertem Defizit | Nur wenn heute's Kassenstand < 1.000 € |
| **useCashBalanceData Hook** | Wird importiert und genutzt | Wird nicht mehr genutzt (entfernen) |

