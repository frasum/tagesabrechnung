

# „Bargeld bis April 2026" auf den ausgewählten Monat einschränken

## Problem
Die Karte **„Bargeld bis April 2026"** zeigt aktuell die kumulierte Summe **aller Tage bis zum Monatsende** (also auch alle Vormonate). Du willst stattdessen nur die **Tageswerte vom 01.04. bis 30.04.2026** aufaddieren.

Dasselbe gilt analog für die Karte **„Bankeinzahlungen"** — auch dort werden aktuell alle Einzahlungen bis Monatsende summiert.

## Lösung
In `src/pages/CashBalance.tsx` werden die Filter so angepasst, dass nur Zeilen des **gewählten Monats** berücksichtigt werden:

```ts
const monthStart = `${selectedMonth}-01`;
const monthEnd   = `${selectedMonth}-31`;

cumulativeCash    = Σ row.rawBargeld     wobei monthStart ≤ row.date ≤ monthEnd
totalDeposits     = Σ deposit.amount     wobei monthStart ≤ deposit_date ≤ monthEnd
```

## Auswirkung auf die vier Karten
| Karte | Vorher | Nachher |
|---|---|---|
| **Bargeld im April 2026** | Σ aller Tage bis 30.04. | **Σ nur 01.04.–30.04.** |
| **Bankeinzahlungen** | Σ aller Einzahlungen bis 30.04. | **Σ nur 01.04.–30.04.** |
| **Verbleibendes Bargeld** | `2.000 + Bargeld − Einzahlungen` (auf neuer Basis) | identisch berechnet, jetzt rein April-bezogen |
| **Verbleibendes Bargeld (kumulativ)** | bleibt **kumulativ** (echter Kassenstand zum Monatsende) | unverändert |

## Titel-Anpassung
- „Bargeld bis April 2026" → **„Bargeld im April 2026"**
- „Bankeinzahlungen" → **„Bankeinzahlungen im April 2026"**
- „Verbleibendes Bargeld" → **„Saldo April (vereinfacht)"** — damit klar ist, dass dies eine reine Monatsbetrachtung ohne historische Kette ist
- „Verbleibendes Bargeld (kumulativ)" bleibt — das ist der einzige echte Gesamt-Kassenstand

## Betroffene Datei
- `src/pages/CashBalance.tsx` — Filter auf `monthStart`/`monthEnd` einschränken, Karten-Labels anpassen

## Hinweis
Die **Tabelle „Tägliche Bargeldübersicht"** darunter zeigt ohnehin schon nur den gewählten Monat — die Karten sind danach also konsistent mit der Tabelle.

