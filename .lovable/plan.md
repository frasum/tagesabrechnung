

## Fix: Wöchentliche Stunden im kumulierten PDF/Excel-Export

### Problem
Die Export-Funktionen (`exportZusammenfassungPdf`, `exportZusammenfassungExcel`) bauen intern ein `weekNumberToIds`-Mapping aus dem `weeks`-Array. Im kumulierten Modus enthält dieses Array nur eine Week-ID pro Wochennummer (dedupliziert), aber die Shifts referenzieren Week-IDs aus mehreren Restaurants. Daher werden nur Stunden eines Restaurants in den Wochenspalten angezeigt, während "Gesamt" korrekt ist (da es direkt über alle Shifts summiert).

### Lösung
Beiden Export-Funktionen ein optionales `weekNumberToIds`-Parameter hinzufügen. Wenn übergeben, wird dieses statt des intern generierten Mappings verwendet.

### Änderungen

**1. `src/lib/exportZusammenfassungPdf.ts`**
- Neuer optionaler Parameter: `weekNumberToIds?: Record<number, string[]>`
- Wenn übergeben, das interne Mapping überspringen und das übergebene verwenden

**2. `src/lib/exportZusammenfassungExcel.ts`**
- Gleicher optionaler Parameter und gleiche Logik

**3. `src/pages/zeiterfassung/ZtZusammenfassung.tsx`**
- Bei den Export-Aufrufen im kumulierten Modus `cumData.weekNumberToAllIds` als zusätzlichen Parameter übergeben

