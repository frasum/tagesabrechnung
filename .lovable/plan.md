

## Performance-Analyse: Bundle-Größe, Query-Effizienz & Lazy Loading

### Zusammenfassung

Die App ist insgesamt gut strukturiert. Es gibt **3 konkrete Optimierungsmöglichkeiten** und einige Beobachtungen.

---

### 1. Bundle-Größe — Schwere Bibliotheken nicht lazy-loaded

**Problem:** `xlsx` (~900 KB), `pdfjs-dist` (~800 KB), `react-markdown` (~100 KB) und `recharts` (~300 KB) werden statisch importiert. Sie landen im Haupt-Bundle oder in Chunks, die beim ersten Seitenaufruf geladen werden könnten.

- `exportWochenplanExcel.ts`, `exportBuchhaltungExcel.ts`, `exportZusammenfassungExcel.ts` importieren `xlsx` statisch mit `import * as XLSX from "xlsx"` — diese Dateien werden direkt in die Zeiterfassungs-Seiten importiert (kein dynamischer Import)
- `PdfPreview.tsx` importiert `pdfjs-dist` statisch
- `RestaurantChat.tsx` importiert `react-markdown` statisch (ist aber lazy-loaded als Seite — OK)

**Fix:** Die Excel-Export-Funktionen mit `const XLSX = await import("xlsx")` dynamisch laden, sodass die 900 KB nur beim tatsächlichen Export-Klick geladen werden. Gleiches für `pdfjs-dist` in `PdfPreview.tsx`.

**Dateien:**
- `src/lib/exportBuchhaltungExcel.ts` — dynamischer Import
- `src/lib/exportWochenplanExcel.ts` — dynamischer Import
- `src/lib/exportZusammenfassungExcel.ts` — dynamischer Import
- `src/components/shared/PdfPreview.tsx` — dynamischer Import

---

### 2. Query-Effizienz — `select("*")` und fehlende Spaltenauswahl

**Problem:** Mehrere Hooks verwenden `select("*")` statt nur die benötigten Spalten abzufragen. Das ist bei kleinen Tabellen unkritisch, aber bei `zt_shifts` (potenziell Tausende Zeilen) wird unnötig viel Daten übertragen.

**Fix:** In `useCumulatedZtData.ts` die `zt_shifts`-Query auf die tatsächlich benötigten Spalten einschränken:
```
.select("id, week_id, employee_id, shift_date, total_hours, evening_hours, night_hours, sunday_holiday_hours, night_deep_hours, is_holiday, absence_type, department, start_time, end_time")
```

Ebenso `scheduling_periods`, `weeks` und `payroll_notes` auf benötigte Spalten reduzieren.

**Dateien:**
- `src/hooks/useCumulatedZtData.ts`

---

### 3. Große Komponente — ZtWochenplan.tsx (952 Zeilen)

**Beobachtung:** `ZtWochenplan.tsx` ist mit 952 Zeilen sehr groß. Das ist kein direktes Performance-Problem, aber erschwert Wartung und könnte Re-Renders verursachen, wenn der State komplex ist.

**Empfehlung:** Keine sofortige Änderung nötig, aber mittelfristig in Sub-Komponenten aufteilen (Tabellen-Body, Absence-Dialog, Toolbar-Logik).

---

### Kein Problem (bestätigt):

- **Lazy Loading:** Alle 25+ Seiten sind korrekt mit `React.lazy()` geladen
- **Suspense Fallback:** `PageLoader` mit Spinner vorhanden
- **QueryClient staleTime:** Global auf 2 Minuten gesetzt, einzelne Hooks überschreiben sinnvoll (Holidays: 1h, Roles: 5min)
- **PWA Caching:** Supabase-Requests mit NetworkFirst-Strategie, 5 MB Cache-Limit
- **`next-themes`** ist als Dependency vorhanden aber wird nicht aktiv verwendet — unkritisch (tree-shaking entfernt es größtenteils)

---

### Änderungsplan

| Datei | Änderung |
|---|---|
| `src/lib/exportBuchhaltungExcel.ts` | `import * as XLSX` → `const XLSX = await import("xlsx")` |
| `src/lib/exportWochenplanExcel.ts` | Gleiches Pattern |
| `src/lib/exportZusammenfassungExcel.ts` | Gleiches Pattern |
| `src/components/shared/PdfPreview.tsx` | Dynamischer Import von `pdfjs-dist` |
| `src/hooks/useCumulatedZtData.ts` | `select("*")` → explizite Spaltenauswahl |

5 Dateien, jeweils minimale Änderungen. Geschätzte Bundle-Ersparnis: ~1.7 MB beim initialen Load.

