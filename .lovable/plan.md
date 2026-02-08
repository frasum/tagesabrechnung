
# Plan: Wechselgeld zum Bargeldbestand hinzufügen

## Übersicht

Das Wechselgeld ist ein fester Startbetrag, der immer in der Kasse liegt. Dieser wird einmalig eingetragen und zum verbleibenden Bargeldbestand addiert.

## Was du bekommst

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Aktueller Bargeldbestand                                               │
│  Bargeld abzüglich Bankeinzahlungen                                     │
│                                                                         │
│  Wechselgeld:            500,00 €  [Bearbeiten]                        │
│  Bargeld bis Februar:  12.450,00 €                                      │
│  Bankeinzahlungen:     -8.000,00 €                                      │
│  ─────────────────────────────────                                      │
│  Verbleibendes:         4.950,00 €              [+ Einzahlung]          │
│                                                                         │
│  Letzte Einzahlung: 05.02.2026 - 3.000,00 €                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Berechnung:**
`Verbleibendes Bargeld = Wechselgeld + kumuliertes Bargeld - Bankeinzahlungen`

## Technische Umsetzung

### 1. Neue Datenbank-Tabelle: `settings`

Anstatt eine eigene Tabelle nur für Wechselgeld zu erstellen, nutzen wir eine allgemeine Einstellungstabelle (die für zukünftige Einstellungen erweiterbar ist):

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primärschlüssel |
| key | text | Einstellungs-Schlüssel (z.B. "petty_cash") |
| value | jsonb | Wert als JSON (z.B. {"amount": 500}) |
| updated_at | timestamp | Letzte Änderung |

**Vorteil:** Flexibel für weitere Einstellungen in der Zukunft

### 2. Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/useSettings.ts` | Hook zum Lesen/Schreiben von Einstellungen |
| `src/components/cash-balance/PettyCashSetting.tsx` | Komponente zum Anzeigen/Bearbeiten des Wechselgelds |

### 3. Änderungen an bestehenden Dateien

**`src/pages/CashBalance.tsx`:**
- Import des Wechselgeld-Hooks
- Berechnung: `verbleibendesBargeld = wechselgeld + cumulativeCash - cumulativeDeposits`

**`src/components/cash-balance/CashBalanceSummary.tsx`:**
- Neues Prop `pettyCash` für den Wechselgeldbetrag
- Zeigt das Wechselgeld als erste Zeile in der Berechnung an
- Berücksichtigt Wechselgeld im verbleibenden Bargeld

### 4. Ablauf beim Bearbeiten

```text
+------------------+     +-------------------+     +------------------+
| Nutzer klickt    | --> | Eingabefeld wird  | --> | Speichern in     |
| "Bearbeiten"     |     | aktiviert         |     | settings         |
+------------------+     +-------------------+     +------------------+
                                                          |
                                                          v
+------------------+     +-------------------+     +------------------+
| Alle Berechnungen| <-- | React Query       | <-- | Daten neu laden  |
| aktualisiert     |     | invalidiert Cache |     |                  |
+------------------+     +-------------------+     +------------------+
```

## Vorteile

- **Einfach:** Nur ein Wert, der einmal eingetragen wird
- **Flexibel:** Kann jederzeit angepasst werden
- **Übersichtlich:** Wechselgeld ist klar in der Berechnung sichtbar
- **Erweiterbar:** Die settings-Tabelle kann für weitere Einstellungen genutzt werden
