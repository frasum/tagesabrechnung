
# Fix: Fehlbetrag Vortag aktualisiert sich nicht nach Aenderungen

## Problem
Wenn Daten fuer einen Tag geaendert werden (z.B. 500 EUR Sonstige Einnahmen am 9. Februar), bleibt der "Fehlbetrag Vortag" am Folgetag (10. Februar) auf dem alten Wert (-271,16 EUR statt 0 EUR). Der Grund: Die Mutation `useUpdateSession` invalidiert nur den eigenen Session-Cache, aber nicht den `previous-day-deficit`-Cache, der vom naechsten Tag genutzt wird.

## Loesung
Bei jeder Session-Aenderung auch alle `previous-day-deficit`-Queries invalidieren, damit der Folgetag sofort die korrekten Werte anzeigt.

## Technische Aenderungen

### `src/hooks/useSession.ts`
In den `onSuccess`-Callbacks folgender Mutations zusaetzlich invalidieren:
- `useUpdateSession` (Zeile 76-78)
- `useCreateSession` (Zeile 55-57)

Zusaetzliche Invalidierung:
```
queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
```

### `src/hooks/useAdvances.ts`
In `useCreateAdvance` und `useDeleteAdvance` ebenfalls invalidieren:
```
queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
```

### Betroffene weitere Mutations (gleiche Invalidierungen hinzufuegen):
- `useCreateExpense` / `useDeleteExpense` in `useSession.ts`
- `useCreateWaiterShift` / `useDeleteWaiterShift` / `useUpdateWaiterShift` in `useSession.ts`

Damit wird sichergestellt, dass jede Aenderung an einer Tagesabrechnung sofort die Folgetags-Berechnung aktualisiert.
