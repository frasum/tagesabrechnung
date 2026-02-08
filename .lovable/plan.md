
## Kumulierter Kassenstand mit Ausgleichs-Anzeige

### Übersicht
Du möchtest in der Tagesabrechnung sehen können:
1. **Bargeld des Tages** (wie bisher)
2. **Kumulierter Kassenstand** (wenn gestern -200€ war und heute +300€, zeigt es +100€)
3. **Ausgleich vom Vortag** (wenn das Bargeld von heute ein vorheriges Minus ausgleicht)

### Beispiel-Szenario

```text
Tag 1 (Montag):    Bargeld = -200 €  →  Kasse: -200 € (Defizit)
Tag 2 (Dienstag):  Bargeld = +350 €  →  Kasse: +150 € (Ausgleich!)
                                         ↳ "Ausgleich vom Vortag: 200 €"
                                         ↳ "Neues Guthaben: 150 €"
```

### Neue Kachel in der Tagesabrechnung

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💵 KASSENSTAND                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     Bargeld heute:                    +350,00 €  ✓                  │
│                                                                     │
│     ─────────────────────────────────────────────                   │
│                                                                     │
│  ✅ Defizit vom Vortag ausgeglichen:   200,00 €                     │
│     Verbleibendes Guthaben:           +150,00 €                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Oder wenn das Minus noch nicht ausgeglichen ist:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💵 KASSENSTAND                                            ⚠️       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     Bargeld heute:                    +100,00 €                     │
│                                                                     │
│     ─────────────────────────────────────────────                   │
│                                                                     │
│  ⚠️ Defizit aus Vortagen:             -200,00 €                     │
│     Nach Ausgleich heute:             -100,00 €                     │
│                                                                     │
│            [ 💰 Transfer vom Tresor ]                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Berechnung des kumulierten Kassenstands

```text
Kumulierter Kassenstand (bis zum ausgewählten Datum) =
    Startbestand Restaurant-Kasse (Wechselgeld / 2)
  + Summe aller Bargeld-Tage bis zum gewählten Datum
  + Summe aller Transfers vom Tresor bis zum gewählten Datum
  − Summe aller Transfers zum Tresor bis zum gewählten Datum
```

### Anzeige-Logik

| Situation | Anzeige |
|-----------|---------|
| Heute positiv, Vortag war negativ, jetzt ausgeglichen | ✅ "Defizit ausgeglichen" + Guthaben |
| Heute positiv, kein Defizit vorhanden | Nur "Bargeld heute" (normal) |
| Heute negativ, Defizit besteht | ⚠️ "Kumuliertes Defizit" + Transfer-Button |
| Heute positiv, aber Defizit noch nicht komplett ausgeglichen | ⚠️ "Teilweise ausgeglichen" + verbleibendes Defizit |

### Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/DailySummary.tsx` | Neue "Kassenstand"-Kachel mit Ausgleichs-Logik hinzufügen |
| `src/pages/ManagerDashboard.tsx` | Bargeld-Kachel mit Transfer-Button hinzufügen |
| `src/components/register/TransferDialog.tsx` | Optional: Vorgeschlagener Betrag für Defizit-Ausgleich |

### Implementierung in DailySummary.tsx

**Neue Imports:**
```typescript
import { Banknote, Vault, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRegisterTransfers } from '@/hooks/useRegisterTransfers';
import { useCashBalanceData } from '@/hooks/useCashBalanceData';
import { TransferDialog } from '@/components/register/TransferDialog';
```

**Kumulierten Kassenstand berechnen:**
```typescript
const { data: cashBalanceData = [] } = useCashBalanceData(restaurantId);
const { transfers, balances, createTransfer, isCreating } = useRegisterTransfers(restaurantId);
const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

// Kumuliertes Bargeld bis zum VORHERIGEN Tag
const previousDayCumulativeCash = useMemo(() => {
  return cashBalanceData
    .filter(row => row.date < selectedDateStr)
    .reduce((sum, row) => sum + row.bargeld, 0);
}, [cashBalanceData, selectedDateStr]);

// Transfers bis zum gewählten Datum
const transfersUntilDate = useMemo(() => {
  const toRestaurant = transfers
    .filter(t => t.direction === 'to_restaurant' && t.transfer_date <= selectedDateStr)
    .reduce((sum, t) => sum + t.amount, 0);
  const toSafe = transfers
    .filter(t => t.direction === 'to_safe' && t.transfer_date <= selectedDateStr)
    .reduce((sum, t) => sum + t.amount, 0);
  return toRestaurant - toSafe;
}, [transfers, selectedDateStr]);

// Kassenstand vor heute (inkl. Wechselgeld)
const registerBalanceBeforeToday = balances.initialRestaurant + previousDayCumulativeCash + transfersUntilDate;

// Kassenstand nach heute
const registerBalanceAfterToday = registerBalanceBeforeToday + bargeld;

// War vorher ein Defizit?
const hadDeficitBefore = registerBalanceBeforeToday < 0;

// Wurde das Defizit ausgeglichen?
const deficitWasCleared = hadDeficitBefore && registerBalanceAfterToday >= 0;

// Wie viel wurde ausgeglichen?
const amountCleared = deficitWasCleared ? Math.abs(registerBalanceBeforeToday) : 0;
```

**Neue Kachel im Grid (nach den StatCards):**
```jsx
<Card className={registerBalanceAfterToday < 0 ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-lg">
      <Banknote className="w-5 h-5" />
      Kassenstand
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Bargeld heute */}
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">Bargeld heute</span>
      <span className={`font-semibold tabular-nums ${bargeld >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
        {formatCurrency(bargeld)}
      </span>
    </div>

    {/* Ausgleich anzeigen */}
    {deficitWasCleared && (
      <div className="flex items-center gap-2 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span className="text-sm">Defizit ausgeglichen: {formatCurrency(amountCleared)}</span>
      </div>
    )}

    {/* Kumulierter Stand */}
    <Separator />
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium">Kassenstand nach heute</span>
      <span className={`text-lg font-bold tabular-nums ${registerBalanceAfterToday >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
        {formatCurrency(registerBalanceAfterToday)}
      </span>
    </div>

    {/* Transfer-Button bei Defizit */}
    {registerBalanceAfterToday < 0 && (
      <Button onClick={() => setShowTransferDialog(true)} variant="outline" className="w-full gap-2">
        <Vault className="w-4 h-4" />
        Transfer vom Tresor
      </Button>
    )}
  </CardContent>
</Card>
```

### Zusammenfassung

| Element | Funktion |
|---------|----------|
| Bargeld heute | Das berechnete Bargeld des gewählten Tages |
| Defizit ausgeglichen | Zeigt an, wenn das Minus vom Vortag durch heutige Einnahmen gedeckt wurde |
| Kassenstand nach heute | Kumulierter Stand inkl. aller Vortage und Transfers |
| Transfer-Button | Ermöglicht Geld aus dem Tresor zu holen, wenn Defizit besteht |

### Vorteile
- **Volle Transparenz**: Du siehst auf einen Blick, ob das Minus ausgeglichen wurde
- **Kumulierte Berechnung**: Das Defizit summiert sich automatisch über Tage
- **Einfache Lösung**: Transfer vom Tresor direkt aus der Tagesabrechnung möglich
- **Konsistent**: Gleiche Logik in Tagesabrechnung und Manager-Dashboard
