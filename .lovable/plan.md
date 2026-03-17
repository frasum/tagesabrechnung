

## Skill-Farben Einstellungen

### Ziel
Eine neue Einstellungsseite unter "Verwaltung" für die individuelle Farbkonfiguration der Dienstplan-Buttons (Skills + Urlaub/Krank/Löschen).

### Änderungen

**1. Neue Komponente: `src/components/settings/SkillColorSettings.tsx`**
- Zeigt alle Skills aus der `skills`-Tabelle mit ihrem aktuellen Farb-Swatch und einem Color-Picker (nativer `<input type="color">`)
- Zusätzlich: Farbe für "Urlaub" und "Krank" (gespeichert in `settings`-Tabelle als `dienstplan_colors` Key, z.B. `{ vacation: "#f59e0b", sick: "#ef4444" }`)
- Speichern-Button aktualisiert die `skills.color`-Spalte direkt per `supabase.from('skills').update({ color }).eq('id', skillId)`
- Gruppiert nach Kategorie (Küche / Service / GL)

**2. Neuer Hook: `src/hooks/useDienstplanColors.ts`**
- Liest/schreibt die Urlaub/Krank-Farben aus `settings`-Tabelle (Key `dienstplan_colors`, kein `restaurant_id` nötig — oder mit Restaurant-ID falls standortspezifisch gewünscht)
- Default-Werte: `{ vacation: '#f59e0b', sick: '#ef4444' }`

**3. Neue Seite: `src/pages/SkillSettings.tsx`**
- Wrapper mit `GlobalLayout`, enthält `SkillColorSettings`
- Titel: "Dienstplan-Farben"

**4. `src/App.tsx`** — Neue Route
- `/skill-settings` unter admin-geschützten globalen Routen

**5. `src/components/layout/AppLayout.tsx`** — Nav-Eintrag
- Neuer Eintrag in `adminNavItems`: `{ path: '/skill-settings', label: 'Farben', icon: Palette, minLevel: 'admin' }`
- Zur Gruppe "Verwaltung" hinzufügen

**6. `src/components/dienstplan/DienstplanPaintToolbar.tsx`** — Farben aus Settings verwenden
- `useDienstplanColors()` einbinden
- Hardcoded `#f59e0b` (Urlaub) und `#ef4444` (Krank) durch dynamische Werte ersetzen
- Skill-Farben kommen bereits aus der DB, brauchen keine Änderung

**7. `src/components/dienstplan/ShiftCell.tsx`** — Gleiche Anpassung
- Urlaub/Krank-Farben im Absence-Popover und Hover dynamisch machen

### UI-Skizze

```text
┌──────────────────────────────────────┐
│  🎨 Dienstplan-Farben                │
│                                      │
│  Küche                               │
│  ■ GRILL     [#e53e3e]  [Picker]     │
│  ■ SUSHI     [#3182ce]  [Picker]     │
│                                      │
│  Service                             │
│  ■ SERVICE   [#38a169]  [Picker]     │
│  ■ BAR       [#d69e2e]  [Picker]     │
│                                      │
│  Abwesenheiten                       │
│  ■ Urlaub    [#f59e0b]  [Picker]     │
│  ■ Krank     [#ef4444]  [Picker]     │
│                                      │
│  [Speichern]                         │
└──────────────────────────────────────┘
```

### Technische Details
- Skill-Farben: direkt in `skills`-Tabelle (existiert bereits)
- Abwesenheits-Farben: in `settings`-Tabelle mit Key `dienstplan_colors` (kein DB-Migration nötig, `settings`-Tabelle existiert bereits)
- Kein neues DB-Schema erforderlich

6 Dateien: 2 neue (Seite + Hook), 4 bestehende anpassen (App.tsx, AppLayout, PaintToolbar, ShiftCell)

