

## Checkbox "Am Pool beteiligt" wieder hinzufuegen

Der State `newParticipatesInPool` existiert bereits und wird korrekt gespeichert. Aktuell wird der Pool-Status nur als Badge angezeigt (Zeile 310-312), aber es fehlt eine Checkbox zum Umschalten.

### Aenderung in `src/pages/WaiterCashUp.tsx`

Die Badge-Anzeige (Zeilen 309-313) wird durch eine Checkbox mit Label ersetzt:

```tsx
import { Checkbox } from '@/components/ui/checkbox';

// Nach dem StaffSelect, statt der Badge:
{newWaiterName && (
  <div className="flex items-center gap-2 mt-2">
    <Checkbox
      id="participatesInPool"
      checked={newParticipatesInPool}
      onCheckedChange={(checked) => setNewParticipatesInPool(checked === true)}
    />
    <Label htmlFor="participatesInPool">Am Pool beteiligt</Label>
  </div>
)}
```

Der Default-Wert wird weiterhin aus den Stammdaten des gewaehlten Mitarbeiters uebernommen (Zeile 302-306), kann aber nun manuell ueberschrieben werden.

