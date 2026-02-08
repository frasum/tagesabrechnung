
# Plan: Monatlich kumulierter Bargeldbestand

## Was sich ändert

**Aktuell:**
- Zeigt nur Bargeld des ausgewählten Monats
- Beispiel Februar: Zeigt nur die Summe der Februar-Tage

**Neu:**
- Zeigt kumuliertes Bargeld bis zum Ende des ausgewählten Monats
- Beispiel Februar: Januar-Bargeld + Februar-Bargeld = Gesamtes Bargeld bis Ende Februar

## Beispiel

| Monat   | Tages-Bargeld | Bankeinzahlung | Kumuliert |
|---------|---------------|----------------|-----------|
| Januar  | 8.000 EUR     | -5.000 EUR     | 3.000 EUR |
| Februar | 6.000 EUR     | -4.000 EUR     | 5.000 EUR |
| Marz    | 7.000 EUR     | -0 EUR         | 12.000 EUR|

Wenn du Februar auswaehlst, siehst du:
- Tabelle: Nur Februar-Tage
- Monats-Gesamt: 6.000 EUR (nur Februar)
- **Kumulierter Bestand bis Ende Februar: 3.000 + 6.000 - 4.000 = 5.000 EUR**

## UI-Anpassung

In der Zusammenfassungs-Karte oben:

```
Aktueller Bargeldbestand
Bargeld abzuglich Bankeinzahlungen

Bargeld gesamt (bis Ende Februar):    14.000,00 EUR   <-- Kumuliert
Bankeinzahlungen (gesamt):            -9.000,00 EUR   <-- Alle Einzahlungen
                                      ---------------
Verbleibendes Bargeld:                 5.000,00 EUR
```

## Technische Umsetzung

### Datei: src/pages/CashBalance.tsx

1. **Neuer kumulierter Wert berechnen**
   - Summe aller Bargeld-Werte bis einschliesslich des ausgewaehlten Monats
   - Nicht nur der aktuelle Monat, sondern alle vorherigen Monate einbeziehen

2. **Bankeinzahlungen ebenfalls kumuliert**
   - Alle Bankeinzahlungen bis einschliesslich des ausgewaehlten Monats summieren

### Aenderungen

```typescript
// Kumuliertes Bargeld bis zum ausgewaehlten Monat berechnen
const cumulativeCash = useMemo(() => {
  if (!data || !selectedMonth) return 0;
  return data
    .filter((row) => row.date <= `${selectedMonth}-31`) // Bis Ende des Monats
    .reduce((sum, row) => sum + row.bargeld, 0);
}, [data, selectedMonth]);

// Kumulierte Bankeinzahlungen bis zum ausgewaehlten Monat
const cumulativeDeposits = useMemo(() => {
  if (!deposits || !selectedMonth) return 0;
  return deposits
    .filter((d) => d.deposit_date <= `${selectedMonth}-31`)
    .reduce((sum, d) => sum + d.amount, 0);
}, [deposits, selectedMonth]);
```

3. **CashBalanceSummary mit kumulierten Werten**
   - `totalCash` wird durch `cumulativeCash` ersetzt
   - `totalDeposits` wird durch `cumulativeDeposits` ersetzt

### Datei: src/components/cash-balance/CashBalanceSummary.tsx

Kleine Anpassung der Beschriftung:
- "Bargeld gesamt" wird zu "Bargeld bis [Monat]"
- Zeigt klar, dass es sich um den kumulierten Wert handelt

## Vorteile

- Du siehst immer, wie viel Bargeld tatsachlich noch da sein sollte
- Uebertrage von Vormonaten gehen nicht verloren
- Bankeinzahlungen werden korrekt abgezogen
