
## Plan: Warnungen ins Manager-Dashboard verschieben

### Warum das besser ist
- Der Manager gibt POS Total und Terminal-Werte im Dashboard ein
- Wenn es eine Differenz zu den Kellner-Daten gibt, sieht er das sofort
- In der Tagesabrechnung ist es eher eine reine Zusammenfassung

### Was gemacht wird

**1. Manager-Dashboard (`src/pages/ManagerDashboard.tsx`)**

Warnkarten hinzufügen, die erscheinen wenn:
- POS Total nicht mit der Summe der Kellner-Umsätze übereinstimmt
- Terminal 1+2 nicht mit der Summe der Kellner-Kartenzahlungen übereinstimmen
- KK Gesamtliste nicht mit Kellner-Karten übereinstimmt (falls eingetragen)

Die Warnungen erscheinen direkt unter dem Header, bevor die Eingabefelder kommen.

**2. Tagesabrechnung (`src/pages/DailySummary.tsx`)**

Die Warnkarten werden entfernt - die Seite wird zu einer reinen Übersicht ohne Warnungen.

### Berechnung der Differenzen (wird ins Dashboard verschoben)

| Prüfung | Formel |
|---------|--------|
| POS Differenz | `formData.pos_total - kellnerUmsatz` |
| Terminal Differenz | `(terminal_1 + terminal_2) - totalCardTotal` |
| KK GL Differenz | `card_total_gl - totalCardTotal` (nur wenn card_total_gl > 0) |

### Design
Gleiche rote Warnkarten wie bisher:
- Roter Rahmen und Hintergrund
- AlertTriangle Icon
- Beschreibung was nicht stimmt
- Differenz-Betrag hervorgehoben

### Dateien die geändert werden
- `src/pages/ManagerDashboard.tsx` - Warnkarten hinzufügen
- `src/pages/DailySummary.tsx` - Warnkarten entfernen
