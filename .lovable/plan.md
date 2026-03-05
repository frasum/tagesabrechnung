

## Namensanzeige: Spitzname nicht doppelt, Personalnummer ohne Klammer

### Problem
Aktuell: `Kriankrai (APPEL) Klakhaeng (APPEL · 117)` — der Spitzname erscheint zweimal. Der Spitzname ist bereits im Namensteil `first_name (NICKNAME) last_name` integriert, wird aber nochmal in den Metadaten wiederholt.

### Gewünschtes Format
`Kriankrai (APPEL) Klakhaeng 117` — nur die Personalnummer, ohne Klammer, als kleine Ergänzung.

### Änderungen

**Gleiche Logik in 4 Stellen:**

1. **`src/pages/zeiterfassung/buchhaltung/BuchhaltungRow.tsx`** (Zeilen 38-48)
   - Namensaufbau: `first_name (NICKNAME) last_name` statt `first_name last_name (NICKNAME · perso_nr)`
   - Perso-Nr als eigenes `<span>` ohne Klammer danach

2. **`src/pages/shared/SharedZtView.tsx`** (Zeilen 840-853)
   - Identische Anpassung

3. **`src/pages/shared/PayrollPortal.tsx`** Zusammenfassungs-Tab (Zeile 956-958)
   - Bereits im Format `nickname - Vorname Nachname` → Vereinheitlichen

4. **`src/pages/zeiterfassung/ZtZusammenfassung.tsx`** (Zeile 266-268)
   - Bereits im Format `perso_nr nickname - Vorname Nachname` → Vereinheitlichen

**Neues einheitliches Format:**
```
Vorname (SPITZNAME) Nachname  117
```
- Nickname nur in Klammern zwischen Vor- und Nachname (wenn vorhanden)
- Personalnummer als kleine Zahl ohne Klammer am Ende
- Falls kein `first_name`/`last_name`: Fallback auf `name`

**Auch in PDF/Excel-Exporten anpassen:**

5. **`src/lib/exportZusammenfassungPdf.ts`** (Zeile 182)
6. **`src/lib/exportZusammenfassungExcel.ts`** (Zeile 124)
7. **`src/lib/exportBuchhaltungPdf.ts`** + **`src/lib/exportBuchhaltungExcel.ts`** — prüfen und angleichen

