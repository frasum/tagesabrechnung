

# Bargeldbestand-Karte: Übersichtlicher + Vormonats-Saldo integrieren

## Ziel
Die Karte „Aktueller Bargeldbestand" wird visuell aufgeräumt **und** zeigt zusätzlich den Übertrag aus dem Vormonat (Überschuss oder Defizit), damit die Monatsbewegung im Kontext des kumulierten Saldos sichtbar ist.

## Neuer Aufbau

```text
┌────────────────────────────────────────────────────────────────────────┐
│  💼 Aktueller Bargeldbestand                                            │
│                                                                         │
│  ┌──────────────────────────┐   ┌──────────────────────────────────┐  │
│  │ PHYSISCH IN DER KASSE    │   │ Aufschlüsselung                  │  │
│  │                          │   │ Wechselgeld-Sockel    2.000,00 € │  │
│  │   5.198,13 €             │   │ Operativer Saldo     +3.198,13 € │  │
│  │   (Hero, groß, farbig)   │   │ ────────────────────────────────│  │
│  │                          │   │ Physisch               5.198,13 € │  │
│  └──────────────────────────┘   └──────────────────────────────────┘  │
│                                                                         │
│  ▾ Monatsbewegung April 2026                                           │
│     Übertrag aus März 2026        +2.866,00 €  ← NEU                   │
│     Bargeldzufluss April          +2.332,13 €                          │
│     Bankeinzahlungen April             0,00 €                          │
│     ──────────────────────────────────────────                         │
│     Saldo Ende April              +5.198,13 €                          │
│                                                                         │
│     Letzte Einzahlung: 31.03.2026 · 8.940,93 €     [+ BANKEINZAHLUNG] │
└────────────────────────────────────────────────────────────────────────┘
```

## Konkrete Änderungen

### 1. `CashBalanceSummary.tsx` — UI-Refactor
- **Hero-Zahl** (groß, prominent): physischer Kassenbestand (`pettyCash + wechselgeldbestand`), grün/rot je nach Vorzeichen
- **Aufschlüsselungs-Mini-Tabelle** rechts daneben: Wechselgeld-Sockel + Operativer Saldo = Physisch
- **Monatsbewegungs-Block** als sekundärer Bereich darunter mit 4 Zeilen:
  - Übertrag Vormonat (NEU, mit Vormonatsname)
  - Bargeldzufluss aktueller Monat
  - Bankeinzahlungen aktueller Monat
  - Saldo Ende Monat (Summenzeile)
- **Verwirrenden Wert** „Saldo April 2026 (vereinfacht)" entfernen
- **Wechselgeld-Editor** (`PettyCashSetting`) inline in der Aufschlüsselung
- **Tooltips** auf jede Zeile für fachliche Erklärung
- **Button** „BANKEINZAHLUNG" rechts unten im Monatsbewegungs-Block

### 2. `useCashBalanceData` — Vormonats-Saldo bereitstellen
Neue Werte berechnen und zurückgeben:
- `previousMonthCarryOver`: physischer Bestand am letzten Tag des Vormonats (via `compute_carry_over` für Vormonats-Enddatum, plus `pettyCash`)
- `previousMonthLabel`: z. B. „März 2026" für die Anzeige

Damit ist die Zeile „Übertrag aus [Vormonat]" datentechnisch versorgt, ohne neue Server-Logik.

### 3. Props-Erweiterung
`CashBalanceSummary` erhält neue Props:
- `previousMonthCarryOver: number`
- `previousMonthLabel: string`

`CashBalance.tsx` reicht diese aus dem Hook durch.

## Tooltips
- **Physisch in der Kasse** → „Tatsächlich in der Kassenschublade vorhandenes Bargeld"
- **Wechselgeld-Sockel** → „Fester Bargeldbestand, der immer in der Kasse verbleibt"
- **Operativer Saldo** → „Kumulierter Tageskassen-Überschuss/-Defizit seit Aufzeichnungsbeginn"
- **Übertrag Vormonat** → „Physischer Kassenbestand am letzten Tag des Vormonats"
- **Saldo Ende Monat** → „Übertrag + Zuflüsse − Einzahlungen"

## Betroffene Dateien
- `src/components/cash-balance/CashBalanceSummary.tsx` (UI-Refactor)
- `src/hooks/useCashBalanceData.ts` (Vormonats-Saldo berechnen)
- `src/pages/CashBalance.tsx` (neue Props durchreichen)

## Nicht betroffen
- `compute_carry_over`, Datenmodell, Tagesabrechnung, `usePreviousDayDeficit`
- Bestehende Tabelle/Spalten im Bargeldbestand-Verlauf

## Erwartetes Ergebnis
- Klare Hauptzahl statt 4 konkurrierender Werte
- Vormonats-Übertrag explizit sichtbar (Überschuss **oder** Minus)
- Monat im Kontext: Übertrag + Bewegung = aktueller Saldo
- Kein verwirrendes „Saldo (vereinfacht)" mehr

