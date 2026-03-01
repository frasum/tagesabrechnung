

## Plan: PIN-geschützter Lohnbüro-Bereich (alle Restaurants)

### Kernkonzept
Das Lohnbüro bekommt eine feste URL `/lohnbuero`. Nach PIN-Eingabe sieht es alle freigegebenen Perioden aller Restaurants und kann in eine kumulative Ansicht (alle Restaurants zusammen) einsteigen — mit voller Schichtbearbeitung wie im bestehenden Sharing-Link.

### Datenbank

**Neue Tabelle `payroll_office_settings`:**
- `id` UUID PK
- `pin_code` TEXT (4–6 Ziffern, plain — kein User-Login)
- `created_at`, `updated_at` TIMESTAMPTZ

Nur eine Zeile (globaler PIN, nicht pro Restaurant). RLS: kein direkter Client-Zugriff (alle Operationen über Edge Functions).

### Backend (Edge Functions)

**1. Neue Edge Function `payroll-office-auth`**
- `POST { pin }` → prüft PIN gegen `payroll_office_settings`
- Bei Erfolg: gibt alle `scheduling_periods` mit `share_token IS NOT NULL` zurück (über alle Restaurants, inkl. Restaurant-Name)
- Rate-Limiting: max 5 Versuche / 15 Min

**2. Neue Edge Function `payroll-office-data`**
- `POST { pin, period_start_date, period_end_date }` → lädt kumulative Daten:
  - Alle Perioden mit gleichem Datumsbereich (alle Restaurants)
  - Alle Wochen, Schichten, Mitarbeiter (dedupliziert nach ID+Department), Payroll-Notes, Vorschüsse, Feiertage
  - Identische Logik wie `useCumulatedZtData.ts`, aber serverseitig
- `POST { pin, action: "upsert_shift", ... }` → Schicht upserten (über alle passenden Perioden/Wochen)
- `POST { pin, action: "upsert_note", ... }` → Payroll-Note upserten

### Frontend

**1. Neue Route `/lohnbuero`** in `App.tsx` (öffentlich, kein Auth)

**2. Neue Seite `src/pages/shared/PayrollPortal.tsx`:**
- **PIN-Screen**: 4–6 Ziffern eingeben → validieren via `payroll-office-auth`
- **Perioden-Liste**: nach erfolgreicher PIN-Eingabe alle freigegebenen Perioden anzeigen (gruppiert nach Datumsbereich, Restaurant-Name als Info)
- **Kumulative Ansicht**: Klick auf Periode → öffnet eine Ansicht identisch zur `SharedZtView`, aber mit kumulierten Daten über alle Restaurants
  - Wochenplan mit Abteilungs-Gruppierung (Küche, GL, Service)
  - Schichtzeiten editierbar (Start/Ende, Urlaub/Krank)
  - Zusammenfassung & Buchhaltung
  - PDF/Excel-Export

**3. Admin-Einstellung für PIN:**
- Neuer Abschnitt in `ZtPerioden.tsx`: PIN festlegen/ändern + Lohnbüro-URL kopieren
- Edge Function `payroll-office-auth` auch für `POST { pin, action: "set_pin", new_pin, caller_staff_id }` (Admin-only)

### Technische Details
- Die Schichtbearbeitung im Portal funktioniert analog zum Sharing-Link, aber der Upsert muss den richtigen `week_id` über alle Restaurants hinweg finden (Mitarbeiter kann in mehreren Restaurants arbeiten)
- Deduplizierung der Wochen nach `week_number` (wie in `useCumulatedZtData`)
- PIN wird im `sessionStorage` des Browsers gespeichert, damit der Nutzer bei Seitenwechsel nicht erneut eingeben muss

