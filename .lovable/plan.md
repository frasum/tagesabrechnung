

## Bugfix: NaN beim Wechselgeldbestand

### Ursache
Der React-Query-Cache im Browser enthaelt noch Daten von **vor** der letzten Aenderung. Diese alten Zeilen haben kein `rawBargeld`-Feld, daher ergibt `kassenbestand += undefined` den Wert `NaN`.

### Loesung
Einen Fallback in `useRemainingCash.ts` und `CashBalance.tsx` einbauen, der auf `bargeld` zurueckfaellt wenn `rawBargeld` nicht vorhanden ist:

```text
row.rawBargeld ?? row.bargeld
```

### Aenderungen

**1. `src/hooks/useRemainingCash.ts` (Zeile 23)**
- Alt: `kassenbestand += row.rawBargeld;`
- Neu: `kassenbestand += row.rawBargeld ?? row.bargeld;`

**2. `src/pages/CashBalance.tsx` (Zeile 63)**
- Alt: `kassenbestand += row.rawBargeld;`
- Neu: `kassenbestand += row.rawBargeld ?? row.bargeld;`

### Auswirkung
- Sofortige Behebung des NaN-Fehlers
- Sobald der Cache sich erneuert, wird automatisch der korrekte `rawBargeld`-Wert verwendet
- Keine Datenbank-Aenderungen noetig
