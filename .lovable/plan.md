

## Fehlzeiten als Paint-Modus im Küchenplan

### Konzept

Urlaub und Krank werden wie die Skill-Buttons als Paint-Modi in die ToggleGroup integriert. Klickt man nach Auswahl auf eine Grid-Zelle, öffnet sich ein kleines Popover mit Von/Bis-Datumswahl (vorausgefüllt mit dem geklickten Datum). Nach "Speichern" wird die Abwesenheit über `useUpsertAbsence` geschrieben.

### Änderungen

**1. `src/pages/KuechePlan.tsx`** — Zwei neue ToggleGroupItems hinzufügen

- `__vacation` (amber) und `__sick` (rot) als Werte in die bestehende ToggleGroup
- `handleSkillToggle` erweitern: bei `__vacation`/`__sick` wird ein neuer State `absencePaintType` gesetzt (`'vacation' | 'sick' | null`), Skill/Delete deaktiviert
- Neuer State: `absencePaintType`
- An `MonthlyGrid` weitreichen: neue Prop `paintAbsenceType`
- Indicator-Bar: Farbe amber für Urlaub, rot für Krank, Text "Urlaub" / "Krank"
- Hilfetext: "Klick = Abwesenheit eintragen"

**2. `src/components/dienstplan/MonthlyGrid.tsx`** — Neue Prop durchreichen

- Neue Prop `paintAbsenceType?: 'vacation' | 'sick' | null`
- An `ShiftCell` als neue Prop `paintAbsenceType` weitergeben

**3. `src/components/dienstplan/ShiftCell.tsx`** — Absence-Paint-Modus

- Neue Prop `paintAbsenceType?: 'vacation' | 'sick' | null`
- Wenn `paintAbsenceType` gesetzt: Klick auf leere Zelle öffnet ein Popover mit:
  - Start-Datum (vorausgefüllt mit dem Zellen-Datum)
  - End-Datum (vorausgefüllt mit dem Zellen-Datum, für einen einzelnen Tag)
  - Speichern-Button → ruft `useUpsertAbsence` auf
- Klick auf bestehende Absence-Zelle → öffnet gleiches Popover zum Bearbeiten (Daten vorausgefüllt)
- Kein separater Dialog nötig, alles inline im Popover
- Visuell: Zelle zeigt im Hover amber/rot Hintergrund je nach Typ

### UI im Popover (kompakt)

```text
┌─────────────────────┐
│  🏖️ Urlaub          │
│  Von: [15.03.26]    │
│  Bis: [15.03.26]    │
│  [Speichern]        │
└─────────────────────┘
```

Zwei Calendar-Popovers innerhalb des ShiftCell-Popovers (wie in AbsenceDialog).

### Technische Details

- `isPaintMode` in ShiftCell wird erweitert: `!!(paintSkillId || paintDeleteMode || paintAbsenceType)`
- Beim Absence-Paint wird statt eines direkten Klick-Handlers ein Popover geöffnet (da Datumseingabe nötig)
- `useUpsertAbsence` wird direkt in ShiftCell verwendet
- Start-Datum default = Zellen-Datum, End-Datum default = Zellen-Datum (für einen Tag reicht ein Klick + Speichern)

4 Dateien betroffen: KuechePlan.tsx, MonthlyGrid.tsx, ShiftCell.tsx (+ MonthlyGrid Props Interface)

