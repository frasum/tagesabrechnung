

## Tooltips für erweiterten SFN-Modus anpassen

Aktuell zeigen die Tooltips nur den Zuschlagsprozentsatz. Im erweiterten (§3b) Modus sollen sie zusätzlich erklären, dass die Zuschläge additiv berechnet werden.

### Änderung in `src/components/zeiterfassung/SfnTooltipHeader.tsx`

- Neues optionales Prop `sfnMode?: SfnMode` hinzufügen
- Zwei Tooltip-Text-Sets: eins für "simple", eins für "extended"
- Im Extended-Modus erklären die Tooltips die additive Logik:

| Spalte | Simple | Extended |
|--------|--------|----------|
| 20–24 | 25 % Nachtzuschlag | 25 % Nachtzuschlag (20:00–00:00) — additiv zu So/Fei-Zuschlägen |
| 24–x | 40 % Nachtzuschlag | 40 % Nachtzuschlag (00:00–04:00) — additiv zu So/Fei-Zuschlägen |
| So/Fei | 50 % Sonn- und Feiertagszuschlag | *(nicht im Extended-Modus)* |
| So | *(nicht im Simple-Modus)* | 50 % Sonntagszuschlag (§3b EStG) |
| Fei | *(nicht im Simple-Modus)* | 125 % Feiertag / 150 % besondere Feiertage (1. Mai, 25./26.12.) |

### Aufrufer anpassen

`BuchhaltungTableHead.tsx`, `ZtWochenplan.tsx`, `ZtZusammenfassung.tsx` — das `sfnMode`-Prop an `SfnTooltipHeader` durchreichen, wo es bereits verfügbar ist.

