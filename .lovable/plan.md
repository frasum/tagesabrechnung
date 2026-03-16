

## Plan: Schnelle Skill-Zuweisung per Klick im Dienstplan-Grid

### Idee

Statt eines Popovers mit Zeitfeldern und Speichern-Button: **Ein Klick auf eine leere Zelle zeigt ein kompaktes Dropdown mit den verfügbaren Skills des Mitarbeiters.** Ein Klick auf einen Skill erstellt sofort die Schicht (ohne Uhrzeiten). Ein Klick auf eine bereits belegte Zelle zeigt dasselbe Dropdown zum Ändern oder Löschen.

```text
Aktuell:                          Neu:
┌──────┐  Click  ┌──────────┐    ┌──────┐  Click  ┌────────┐
│  +   │ ──────► │ Von: __  │    │  +   │ ──────► │  VS    │  ← 1 Klick = fertig
│      │         │ Bis: __  │    │      │         │  PASS  │
└──────┘         │ Skill: _ │    └──────┘         │  ──    │
                 │ [Save]   │                     │  Frei  │
                 └──────────┘                     │  Abw.  │
                                                  └────────┘
```

### Verhalten

- **Leere Zelle klicken** → Popover mit Skill-Liste (nur Skills, die der MA kann). Klick auf Skill → sofort `upsertShift` mit `start_time: null`, `end_time: null`, gewähltem Skill. Kein Speichern-Button nötig.
- **Belegte Zelle klicken** → Gleiches Popover, aktueller Skill ist hervorgehoben. Klick auf anderen Skill → sofort update. Option "Löschen" zum Entfernen. Option "Abwesenheit" bleibt erhalten.
- **Zelle ohne Skills** (MA hat keine Skills zugewiesen) → Einfacher Toggle: Klick = Schicht anlegen (ohne Skill), nochmal klicken = löschen.
- **Uhrzeiten entfallen** im Grid komplett. Die Zeiterfassung läuft separat.

### Technische Änderungen

1. **`ShiftCell.tsx`**: Popover-Inhalt ersetzen durch eine kompakte Skill-Auswahl-Liste statt `ShiftEditPopover`. Jeder Skill als farbiger Button. Klick löst direkt `upsertShift` / `deleteShift` aus. Uhrzeiten-Anzeige in der Zelle entfernen (nur noch Skill-Badge anzeigen).

2. **`ShiftEditPopover.tsx`**: Wird nicht mehr gebraucht oder wird zu einer reinen Skill-Schnellauswahl umgebaut mit:
   - Farbige Skill-Buttons (1 Klick = sofort speichern)
   - "Frei" Button zum Löschen
   - "Abwesenheit" Link bleibt

3. **`useDienstplan.ts`**: `upsertShift` erlaubt bereits `null` für `start_time`/`end_time` – keine Änderung nötig.

4. **Zellanzeige**: Nur noch den Skill-Badge anzeigen (farbig, z.B. "VS"), keine Uhrzeiten mehr.

