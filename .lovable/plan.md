

## Besonderheiten-Spalte: Volltext sichtbar machen

### Problem
Die Besonderheiten-Spalte nutzt ein `Textarea` mit fester Höhe (`h-7` = 28px). Bei langen Texten (Vorschüsse + Urlaub + manuelle Einträge) wird der Inhalt abgeschnitten.

### Vorschlag: Auto-Height mit Text-Wrapping

**In `BuchhaltungRow.tsx`:** Die Textarea bekommt `h-auto` statt `h-7` und `overflow-hidden` mit einer CSS-Klasse, die die Höhe automatisch an den Inhalt anpasst. Zusätzlich `whitespace-pre-wrap` für sauberen Zeilenumbruch.

Konkret:
- `min-h-[28px] h-7 resize-none` → `min-h-[28px] h-auto resize-none`
- Beim initialen Render und nach Blur die Textarea-Höhe per `scrollHeight` setzen (via `useEffect` oder `ref`)

Alternativ (einfacher, besonders für das Lohnbüro wo es read-only ist): Im Lohnbüro die Besonderheiten als **normalen Text mit Wrapping** rendern statt als Textarea — das spart den Input-Overhead und zeigt alles direkt an.

### Empfehlung
Beides kombinieren:
- **Lohnbüro (read-only):** Einfacher `<td>` mit Text-Wrapping, kein Input-Element
- **Manager-Ansicht (editierbar):** Auto-expanding Textarea

### Dateien
- `src/pages/zeiterfassung/buchhaltung/BuchhaltungRow.tsx` — Auto-expanding Textarea (1 Zeile CSS + ref-basiertes Auto-Resize)
- `src/pages/shared/PayrollPortal.tsx` — Falls die Buchhaltung dort die gleiche Row-Komponente nutzt, wird `isLocked` bereits übergeben. Wir können `isLocked` nutzen um zwischen Text-Anzeige und Textarea zu wechseln.

Minimale Änderung, keine neuen Abhängigkeiten.

