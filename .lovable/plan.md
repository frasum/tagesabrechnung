
## Wochennummern mit Datumsbereich anzeigen

An drei Stellen werden Wochen aktuell nur als "W1", "W2" etc. angezeigt. Dort wird zusaetzlich der Datumsbereich im Format "dd.MM." ergaenzt.

### Aenderungen

**1. `src/pages/zeiterfassung/ZtWochenplan.tsx` (Zeile 418)**
Button-Label von `W{w.week_number}` aendern zu:
```
W{w.week_number} ({format(parseISO(w.start_date), "dd.MM.")}–{format(parseISO(w.end_date), "dd.MM.")})
```
`format` und `parseISO` sind bereits importiert.

**2. `src/pages/zeiterfassung/ZtZusammenfassung.tsx` (Zeile 200)**
Tabellen-Header von `W{w.week_number}` aendern zu:
```
W{w.week_number} {format(parseISO(w.start_date), "dd.MM.")}–{format(parseISO(w.end_date), "dd.MM.")}
```
`format` und `parseISO` muessen ggf. importiert werden.

**3. `src/pages/shared/SharedZtView.tsx` (Zeile 457)**
Gleiche Anpassung fuer die Lohnbuero-Ansicht:
```
W{w.week_number} ({format(parseISO(w.start_date), "dd.MM.")}–{format(parseISO(w.end_date), "dd.MM.")})
```

Ergebnis: Statt "W1" steht z.B. **"W1 (26.02.–02.03.)"**.
