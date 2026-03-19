

## Code-Review: Produktionsfähigkeit

Nach Prüfung aller relevanten Dateien (Paint-Modus, Farbeinstellungen, Hooks, Routing, Layouts) ist der Code **grundsätzlich produktionsfähig**. Es gibt allerdings **zwei Probleme**, die behoben werden sollten:

---

### Problem 1: Read/Write-Inkonsistenz bei `dienstplan_colors`

**`useDienstplanColors` liest OHNE `restaurant_id`-Filter**, speichert aber MIT `restaurant_id`. Das bedeutet:
- Beim Lesen wird `limit(1).maybeSingle()` ohne Filter auf `restaurant_id` verwendet → es wird ein zufälliger Eintrag zurückgegeben, falls mehrere Restaurants existieren
- Beim Schreiben wird korrekt nach `restaurant_id` gefiltert

**Fix:** Den Read-Query ebenfalls mit `restaurant_id` filtern, oder — da die Farben global gelten sollen — beim Lesen konsistent den gleichen Restaurant-Eintrag verwenden.

**Empfohlener Ansatz:** Da die Farben nicht restaurantspezifisch sein sollen, den Read-Query mit `.eq('key', SETTINGS_KEY).limit(1).maybeSingle()` belassen, aber das Upsert so anpassen, dass es beim Update ebenfalls nur nach `key` filtert (ohne `restaurant_id`), damit Read und Write denselben Datensatz treffen.

---

### Problem 2: `SkillSettings.tsx` — Kein Fallback wenn `restaurantId` leer ist

Die Seite zeigt **nichts an** wenn `restaurants` noch laden oder leer sind. Kein Loading-State, keine Fehlermeldung.

**Fix:** Loading-Spinner und Fallback-Text hinzufügen.

---

### Kein Problem (bestätigt korrekt):
- Paint-Toolbar, ShiftCell, MonthlyGrid: sauber integriert
- Cache-Invalidierung nach Speichern: korrekt (`skills` + `dienstplan_colors`)
- Routing und ProtectedRoute: korrekt konfiguriert
- RLS-Policies: `skills` und `settings` haben offene Policies — passend für diese Admin-Funktion
- Keine Console-Errors

### Änderungen

**1. `src/hooks/useDienstplanColors.ts`**
- Read und Write konsistent machen: beim Upsert nur nach `key` suchen (ohne `restaurant_id`), damit der gelesene und geschriebene Datensatz identisch sind

**2. `src/pages/SkillSettings.tsx`**
- Loading-State hinzufügen während Restaurants laden

2 Dateien, minimale Änderungen.

