

## Plan: Kumulierte Ansicht für Zusammenfassung und Buchhaltung

Ein "Kumuliert"-Toggle neben dem Perioden-Select auf beiden Seiten. Wenn aktiv, werden Mitarbeiterdaten aus allen Restaurants zusammengefasst (eine Zeile pro Mitarbeiter, Stunden addiert).

### Herausforderung

Perioden sind pro Restaurant gespeichert. Für die kumulierte Ansicht muss nach **gleichem Zeitraum** (start_date/end_date) über alle Restaurants hinweg gesucht werden.

### 1. Neuer Hook `src/hooks/useCumulatedZtData.ts`

- Nimmt `enabled: boolean`, `selectedPeriod` (start_date, end_date) entgegen
- Lädt alle `scheduling_periods` mit gleichem Datumsbereich (alle Restaurants)
- Lädt alle `weeks` dieser Perioden
- Lädt alle `zt_shifts` dieser Wochen
- Lädt alle `staff_restaurants` (ohne Restaurant-Filter) mit `zt_department != null`
- Gibt `employees`, `shifts`, `weeks` zurück -- gleiche Struktur wie die Einzel-Restaurant-Daten
- Mitarbeiter werden dedupliziert nach `staff.id + department`: Stunden aus verschiedenen Restaurants addieren sich automatisch, da die Shifts zusammengefasst geladen werden

### 2. Änderung `src/pages/zeiterfassung/ZtZusammenfassung.tsx`

- Neuer State: `const [cumulated, setCumulated] = useState(false)`
- Toggle-Button neben dem Perioden-Select (z.B. `<Button variant={cumulated ? "default" : "outline"}>Kumuliert</Button>`)
- Wenn `cumulated = true`: Daten aus dem neuen Hook verwenden statt `useRestaurantEmployees` + einzelne Shift-Query
- Rest der Logik bleibt identisch (getEmployeeTotals, getWeeklyHours etc. arbeiten auf den gleichen Datenstrukturen)

### 3. Änderung `src/pages/zeiterfassung/ZtBuchhaltung.tsx`

- Gleicher Toggle + gleiche Logik wie bei Zusammenfassung
- `payroll_notes` und `advances` ebenfalls über alle matching Perioden/Restaurants laden wenn kumuliert

### Technisches Detail

Die Deduplizierung funktioniert automatisch: Ein Mitarbeiter mit derselben `staff.id` und `department` erscheint einmal in der sortierten Liste. Die Shift-Berechnung summiert alle Shifts dieses Mitarbeiters unabhängig vom Restaurant, da `getEmployeeTotals` nur nach `employee_id` und `department` filtert.

