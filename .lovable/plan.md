

## Tabellenspalten gleichmäßig anordnen

Die History-Tabelle hat aktuell keine festen Spaltenbreiten, wodurch die Spalten je nach Inhalt unterschiedlich breit werden. 

### Umsetzung in `src/pages/History.tsx`

Feste Breiten über `className` auf die `TableHead`- und `TableCell`-Elemente setzen:

| Spalte | Breite |
|---|---|
| Datum | `w-[180px]` |
| POS Total | `w-[130px]` |
| Kreditkarten (%) | `w-[150px]` |
| Take Away (%) | `w-[150px]` |
| Gäste / Ø Verzehr | `w-[130px]` |
| Tages-Bargeld | `w-[120px]` |
| Aktion (Eye) | `w-[50px]` |

Zusätzlich `table-fixed` auf die `<Table>` setzen, damit die Breiten verbindlich eingehalten werden.

