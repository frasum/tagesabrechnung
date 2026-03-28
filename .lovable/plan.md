

# Systemprüfung: Skalierbarkeit und Stabilität bei wachsenden Daten

## Gesamtbewertung

Das System ist für den aktuellen Umfang (2 Restaurants, ~50 Mitarbeiter) solide aufgebaut. Es gibt jedoch **5 konkrete Risiken**, die bei wachsendem Datenvolumen (mehr Restaurants, mehr Mitarbeiter, mehr Perioden) Probleme verursachen werden.

---

## 1. KRITISCH: zt_shifts Limit von 5.000 Zeilen

**Wo:** Edge Function `payroll-office-data` (Zeile 278), `useCumulatedZtData` (Zeile 72)

**Problem:** Beide nutzen `.limit(5000)`. Bei 50 Mitarbeitern × 30 Tage × 2 Restaurants = 3.000 Schichten pro Periode — noch ok. Aber bei 3+ Restaurants oder Mitarbeitern, die täglich doppelt arbeiten, wird das Limit schnell erreicht. **Abgeschnittene Daten werden nicht erkannt** — es gibt keinen Fehler, nur falsche Summen.

**Lösung:** Pagination mit Zählerprüfung einbauen. Wenn genau 5.000 Zeilen zurückkommen, weitere Seiten laden. Oder: Serverseitig aggregieren statt Rohdaten zu senden.

---

## 2. HOCH: Waiter Shifts ohne Limit

**Wo:** Edge Function `payroll-office-data` (Zeile 300–304)

**Problem:** `waiter_shifts` wird ohne `.limit()` abgefragt. Das Supabase-Default-Limit ist 1.000. Bei täglichen Abrechnungen mit 5–10 Kellnern × 30 Tage × 2 Restaurants = 300–600 Zeilen aktuell ok, aber bei 3+ Restaurants oder längerer Historie wird das Standard-Limit erreicht.

**Lösung:** Explizit `.limit(5000)` hinzufügen, analog zu zt_shifts.

---

## 3. MITTEL: Alle Mitarbeiter werden immer geladen

**Wo:** Edge Function `payroll-office-data` (Zeile 280–285), `useCumulatedZtData` (Zeile 80–113)

**Problem:** Die Mitarbeiter-Query hat keinen Bezug zur ausgewählten Periode — sie lädt **alle aktiven Mitarbeiter aller Restaurants**, auch wenn nur eine Periode betrachtet wird. Bei wachsender Mitarbeiterzahl (inkl. Wechsel über die Jahre) unnötiger Overhead.

**Lösung:** Bereits korrekt auf `restaurantIds` gefiltert in der Edge Function, aber `useCumulatedZtData` filtert **nicht** nach Restaurant. Sollte analog eingeschränkt werden.

---

## 4. MITTEL: Client-seitige O(n²) Filterung

**Wo:** `PayrollPortal.tsx` — `filteredShifts` (Zeile 413–422), `dualDeptIds` (Zeile 382–393)

**Problem:** `filteredShifts` iteriert über alle Shifts und prüft pro Shift, ob `empIds.has()` und `restaurantWeekIds.has()`. Das ist O(n) dank Set — gut. Aber `employeesWithShifts` (Zeile 463–465) nutzt `.some()` über alle `filteredShifts` pro Mitarbeiter — O(Mitarbeiter × Shifts). Bei 5.000 Shifts × 100 Mitarbeiter = 500.000 Iterationen bei jedem Render.

**Lösung:** Shift-Lookup vorab als `Map<string, boolean>` aufbauen (`${employee_id}-${department}` → true), dann O(1) pro Mitarbeiter.

---

## 5. NIEDRIG: 30-Sekunden Polling

**Wo:** `PayrollPortal.tsx` (Zeile 135, 153) — `refetchInterval: 30_000`

**Problem:** Beide Queries (Perioden + Daten) werden alle 30 Sekunden neu geladen. Die Daten-Query lädt **alle Shifts, Mitarbeiter, Advances, Holidays** jedes Mal komplett. Bei großen Datenmengen erzeugt das unnötigen Traffic.

**Lösung:** `staleTime` auf z.B. 60 Sekunden setzen, damit nicht jeder Tab-Wechsel sofort refetched. Alternativ: WebSocket/Realtime nur für Änderungs-Benachrichtigungen, dann gezielt refetchen.

---

## Empfohlene Priorität

| # | Risiko | Aufwand | Empfehlung |
|---|--------|---------|------------|
| 1 | zt_shifts 5k Limit | Mittel | Pagination oder Zähler-Check |
| 2 | waiter_shifts kein Limit | Klein | `.limit(5000)` hinzufügen |
| 3 | Alle Mitarbeiter laden | Klein | Filter in useCumulatedZtData |
| 4 | O(n²) Filterung | Klein | Map-basierter Lookup |
| 5 | 30s Polling | Klein | staleTime erhöhen |

**Fazit:** Das System läuft stabil für 2 Restaurants. Die wichtigsten Maßnahmen sind Punkte 1 und 2 (Limits), um Datenverlust bei wachsendem Volumen zu verhindern. Die übrigen Punkte sind Performance-Optimierungen, die erst bei deutlich mehr Daten spürbar werden.

Soll ich diese Verbesserungen umsetzen?

