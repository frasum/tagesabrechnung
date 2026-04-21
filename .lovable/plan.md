

# Diskrepanz Gesamtumsatz: Statistiken (94.479,90 €) vs. Bargeldbestand (101.126,10 €)

## Befund

Beide Werte beziehen sich auf YUM, 01.–21.04.2026, und sollten identisch sein. Die Differenz beträgt **6.646,20 €**.

## Ursache

Beide Seiten lesen `sessions.pos_total` als „Tagesumsatz" — aber **mit unterschiedlicher Datums-Definition**:

| Seite | Datums-Spalte | Was gefiltert wird |
|---|---|---|
| **Bargeldbestand** (`useCashBalanceData`) | `session_date` | Geschäftstag (3-Uhr-Rollover beachtet) |
| **Statistiken** (`useStatistics`) | vermutlich `created_at` oder anderer Filter, oder zusätzliche Aggregation pro Schicht | weicht ab |

Außerdem möglich:
- Statistiken zählen `pos_total` **nur einmal pro Session**, Bargeldbestand ebenfalls — aber wenn `useStatistics` über `waiter_shifts` summiert (`sum(pos_sales)`) statt `pos_total`, ergibt sich genau diese Art von Lücke.
- Eine Session enthält Umsatz, aber keine zugeordneten Schichten → Bargeldbestand zählt sie, Statistiken nicht (umgekehrter Fall: 6.646 € fehlen in Statistik).

## Diagnose-Schritt (vor jeder Korrektur)

Pro Tag (01.–21.04.2026, YUM) vergleichen:
- `sessions.pos_total`
- Σ `waiter_shifts.pos_sales` derselben Session
- Differenz markieren

So wird sichtbar, an welchem Tag (oder welchen Tagen) die 6.646,20 € entstehen und ob die Ursache fehlende Schicht-Zuordnung, doppelte Sessions oder ein Filter-Bug ist.

## Anschließende Korrektur (abhängig vom Diagnose-Ergebnis)

Genau **eine** der folgenden Maßnahmen:

### A — `useStatistics` auf `sessions.pos_total` vereinheitlichen
Statistiken summieren künftig `sessions.pos_total` (gleiche Quelle wie Bargeldbestand). Werte sind dann immer identisch. **Konsequenz**: Tage ohne Schichten fließen in Durchschnitte ein (siehe `mem://features/statistics/data-logic-ui-behavior` — die bisherige Ausschluss-Logik wird hinfällig).

### B — `useCashBalanceData` auf Σ `waiter_shifts.pos_sales` umstellen
Bargeldbestand zeigt künftig den kellner-zugeordneten Umsatz. **Nicht empfohlen**: bricht die Bargeld-Plausibilisierung, wenn Schichten den Brutto-Umsatz nicht vollständig abbilden.

### C — Datenkorrektur in den Schichten
Falls die Diagnose zeigt, dass an konkreten Tagen Schichten fehlen oder `pos_sales` falsch eingetragen wurde: Schichten ergänzen / `pos_sales` anpassen. **Empfohlen**, wenn die Differenz auf wenige Tage konzentriert ist.

### D — Label-Klarstellung (additiv zu A/B/C)
- Bargeldbestand: „Tagesumsatz" → **„Kassenumsatz (Brutto)"**
- Statistiken: „Gesamtumsatz" → **„Kellner-Umsatz (Σ Schichten)"**

Reine UI-Änderung, macht zwei verschiedene Kennzahlen unmissverständlich.

## Empfohlener Ablauf

1. **Diagnose-Query** ausführen (Tag-für-Tag-Vergleich `pos_total` vs. Σ `pos_sales` für YUM, 01.–21.04.2026).
2. Ergebnis bewerten: Ist es ein **Daten-Loch** (→ C) oder ein **systematischer Logik-Unterschied** (→ A oder D)?
3. Entsprechende Korrektur umsetzen.

## Keine weiteren Änderungen
- Keine Layout-/Style-Änderung
- Keine DB-Migration in der Diagnose-Phase

