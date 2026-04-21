

# Variante C — Spalten + Tooltip für volle Transparenz

## Ziel
Die GESAMT-Bargeld-Zahl soll vollständig nachvollziehbar sein. Dafür werden **versteckte Posten als eigene Spalten** sichtbar gemacht UND zusätzlich ein **Breakdown-Tooltip** auf die GESAMT-„Bargeld"-Zelle gelegt.

## Änderungen

### 1. Datenquelle erweitern (`src/hooks/useCashBalanceData.ts`)
- `sonstige_einnahme` wird bereits aus der Session geladen, aber nicht im `CashBalanceRow` ausgegeben → als neues Feld `sonstigeEinnahme: number` durchreichen.
- `transferEffect` ist bereits vorhanden und wird nur weiterverwendet.

### 2. Tabelle erweitern (`src/pages/CashBalance.tsx`)
Zwei neue, **bedingt sichtbare** Spalten in der Tagestabelle:

| Spalte | Sichtbar wenn | Farblogik |
|---|---|---|
| **Sonst. Einn.** | mind. ein Tag des Monats hat `sonstigeEinnahme ≠ 0` | grün (positiv) |
| **Kassentransfer** | mind. ein Tag des Monats hat `transferEffect ≠ 0` | grün/rot je nach Vorzeichen |

- Beide Spalten erhalten eine **GESAMT-Zelle** im Footer.
- Spaltenposition: direkt vor „Bargeld" (passt zur Lese-Reihenfolge der Formel).
- Wenn beide Spalten in einem Monat 0 sind → Tabelle bleibt unverändert schlank.

### 3. Tooltip auf GESAMT-„Bargeld" (`src/pages/CashBalance.tsx`)
Hover über die GESAMT-Zelle der Bargeld-Spalte zeigt einen kompakten Breakdown:

```
+ Tagesumsätze            12.345,67
+ Gutsch. VK                 250,00
+ Sonst. Einnahmen            35,00
+ Kassentransfers            100,00
− Kreditkarten             6.890,12
− OrderSmart                 412,30
− Wolt                       180,00
− Gutsch. EL                  50,00
− Finedine                     0,00
− Einladung                    0,00
− Offene RE                  120,00
− Vorschuss                  200,00
− Ausgaben                   461,89
─────────────────────────────────
= Bargeld GESAMT           4.417,36
```

- Nutzt den bestehenden `Tooltip`-Baustein (`@/components/ui/tooltip`).
- Werte werden aus den bereits berechneten GESAMT-Summen pro Spalte gebildet (kein zusätzlicher Fetch).

## Erwartetes Ergebnis
- Die horizontale Summe der sichtbaren GESAMT-Zellen entspricht **exakt** der GESAMT-„Bargeld"-Zahl — keine versteckten Posten mehr.
- Der Tooltip liefert zusätzlich eine kompakte Komplettansicht der Formel mit konkreten Monatswerten.

## Betroffene Dateien
- `src/hooks/useCashBalanceData.ts` — `sonstigeEinnahme` ins Row-Objekt aufnehmen
- `src/pages/CashBalance.tsx` — zwei neue Spalten (bedingt) + Footer-Summen + Tooltip auf GESAMT-„Bargeld"

## Nicht betroffen
- Bargeldlogik selbst bleibt unverändert (keine neuen Berechnungen, nur Sichtbarmachung).
- `useRemainingCash`, Tagesabrechnung, PDF-Export bleiben wie sie sind.

