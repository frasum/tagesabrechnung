
# Plan: Trinkgeld-Statistiken pro Mitarbeiter

## Ziel
Neue Statistik-Ansicht hinzufügen, die zeigt:
1. **Kellner-Trinkgeld pro Person** - Wie viel Trinkgeld hat jeder Kellner im Zeitraum verdient
2. **Küchen-Trinkgeld pro Person** - Wie viel Trinkgeld hat jeder Küchenmitarbeiter im Zeitraum bekommen

---

## Datenstruktur

### Kellner-Trinkgeld
| Name | Schichten | Gesamt TG | Ø pro Schicht |
|------|-----------|-----------|---------------|
| Frank | 12 | 1.215,60 € | 101,30 € |
| Max | 10 | 610,00 € | 61,00 € |

**Berechnung:** `cash_handed_in - differenz - kitchen_tip` (bereits vorhanden)

### Küchen-Trinkgeld
| Name | Stunden | Anteil | Gesamt TG |
|------|---------|--------|-----------|
| Maria Küchler | 48 Std | 35% | 892,50 € |
| Hans Koch | 32 Std | 25% | 595,00 € |

**Berechnung:** `(hours_worked / total_hours_per_session) * session_kitchen_tip_pool`

---

## UI-Design (Statistik-Seite)

### Neue Tabs oder Abschnitte
Die bestehende Statistik-Seite wird um zwei neue Diagramme/Tabellen erweitert:

```text
┌────────────────────────────────────────────────────────────┐
│  [Woche] [Monat] [3 Monate]                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Bestehende Charts (Umsatz, Trinkgeld-Trend, etc.)        │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Kellner Trinkgeld   │  │ Küchen Trinkgeld    │         │
│  │                     │  │                     │         │
│  │  [Balkendiagramm]   │  │  [Balkendiagramm]   │         │
│  │                     │  │                     │         │
│  │  Frank    215 €     │  │  Maria    892 €     │         │
│  │  Max      125 €     │  │  Hans     595 €     │         │
│  │  Lisa      85 €     │  │  Peter    340 €     │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
│  Detaillierte Tabellen (optional aufklappbar)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Technische Umsetzung

### 1. useStatistics Hook erweitern

Neue Datenstrukturen hinzufügen:

```typescript
interface WaiterTipStats {
  name: string;
  totalTip: number;
  shiftsCount: number;
  avgTipPerShift: number;
}

interface KitchenTipStats {
  name: string;
  totalHours: number;
  totalTip: number;
  avgTipPerHour: number;
}
```

**Neue Abfragen:**
- `kitchen_shifts` für den Zeitraum laden (mit Session-Join)
- Küchen-Trinkgeld pro Mitarbeiter berechnen: Für jede Session die anteilige Berechnung durchführen

### 2. Statistics.tsx erweitern

Zwei neue Card-Komponenten:

**Kellner-Trinkgeld Chart:**
- Horizontales Balkendiagramm
- Sortiert nach höchstem Trinkgeld
- Zeigt Name + Betrag

**Küchen-Trinkgeld Chart:**
- Horizontales Balkendiagramm
- Sortiert nach höchstem Trinkgeld
- Zeigt Name + Betrag + Stunden

### 3. Detailtabellen (optional)
- Collapsible Tables mit allen Details
- Schichten-Anzahl, Durchschnittswerte

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/hooks/useStatistics.ts` | Kitchen Shifts laden, Trinkgeld pro Person aggregieren |
| `src/pages/Statistics.tsx` | Zwei neue Charts + Tabellen für Kellner- und Küchen-TG |

---

## Berechnungslogik im Detail

### Kellner-Trinkgeld Aggregation
```text
Für jeden Kellner im Zeitraum:
  waiter_tip = SUM(cash_handed_in - differenz - kitchen_tip)
  shifts_count = COUNT(shifts)
  avg_tip = waiter_tip / shifts_count
```

### Küchen-Trinkgeld Aggregation
```text
Für jede Session im Zeitraum:
  kitchen_tip_pool = SUM(waiter_shifts.kitchen_tip)
  total_hours = SUM(kitchen_shifts.hours_worked)
  
  Für jeden Küchenmitarbeiter in dieser Session:
    personal_tip = (hours_worked / total_hours) * kitchen_tip_pool

Aggregiere über alle Sessions:
  total_tip = SUM(personal_tip per session)
  total_hours = SUM(hours_worked)
```

---

## Beispiel-Visualisierung

**Kellner Trinkgeld (Monat):**

| Rang | Name | Schichten | Gesamt | Ø/Schicht |
|------|------|-----------|--------|-----------|
| 1 | Frank | 15 | 1.519,50 € | 101,30 € |
| 2 | Max | 12 | 732,00 € | 61,00 € |
| 3 | Lisa | 10 | 450,00 € | 45,00 € |
| 4 | Tom | 8 | -928,00 € | -116,00 € |

**Küchen Trinkgeld (Monat):**

| Rang | Name | Stunden | Gesamt TG | €/Stunde |
|------|------|---------|-----------|----------|
| 1 | Maria Küchler | 48 | 149,13 € | 3,11 € |
| 2 | Hans Koch | 24 | 74,57 € | 3,11 € |
