

## Fix: Text-Ueberlappung im Zwei-Spalten-PDF

### Problem

Die Gaeste-Zeile (`# 44,79 EUR / Gast`) im linken Spaltenbereich ueberlappt mit den Kellner-Namen (Joy, Pon, etc.) in der rechten Spalte. Der Text ist zu lang fuer die 45%-Spaltenbreite und laeuft visuell in die rechte Spalte hinein.

### Ursache

Die Gaeste-Zeile hat zwei separate Informationen in zwei Zellen:
- Zelle 1: `Gaeste: 45`
- Zelle 2: `oe 44,79 EUR / Gast`

Die rechte Zelle wird nicht abgeschnitten, da `autoTable` den Text bei `theme: 'plain'` ohne Begrenzung rendert. Zusaetzlich fehlt `overflow: 'ellipsize'` oder aehnliches Clipping.

### Loesung

1. **Gaeste-Zeile kompakter gestalten**: Beide Infos in eine Zeile mit `colSpan: 2` zusammenfassen, z.B. `Gaeste: 45  oe 44,79 EUR` -- dadurch nutzt die Zeile die volle Spaltenbreite und der Text wird nicht abgeschnitten.

2. **Overflow-Schutz hinzufuegen**: In den `bodyStyles` der linken Spalte `overflow: 'ellipsize'` setzen, damit kein Text aus der Tabelle herauslaeuft.

### Betroffene Datei

| Datei | Zeilen | Aenderung |
|---|---|---|
| `src/utils/pdfExport.ts` | 169-172 | Gaeste-Zeile mit `colSpan: 2` und kombiniertem Text |
| `src/utils/pdfExport.ts` | 209 | `overflow: 'ellipsize'` zu `bodyStyles` hinzufuegen |

### Technische Details

Gaeste-Zeile aendern von:
```
['Gaeste: 45', 'oe 44,79 EUR / Gast']
```
zu:
```
[{ content: 'Gaeste: 45  ·  oe 44,79 EUR / Gast', colSpan: 2, styles: { fontSize: 6.5 } }]
```

Und in den bodyStyles:
```
bodyStyles: { fontSize: 7, cellPadding: ..., overflow: 'ellipsize' }
```

