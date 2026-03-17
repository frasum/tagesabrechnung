
## Dienstplan – 2 Pläne pro Standort (Küche + Service/GL)

### Status: ✅ Implementiert

### Was wurde gebaut

- **Datenbank**: 4 neue Tabellen (`skills`, `employee_skills`, `shift_assignments`, `absences`) + `contracted_hours_per_month` auf `staff`
- **7 Seed-Skills**: VS, PASS, SPÜLEN, CO (Küche), SERVICE, BAR (Service), GL
- **Routing**: `/:restaurant/dienstplan/kueche` und `/:restaurant/dienstplan/service`
- **Sidebar**: "Dienstplan" unter Tagesgeschäft
- **Grid-UI**: Monatsansicht mit Skill-farbcodierten Zellen, Inline-Edit via Popover, Skill-Besetzungszeile (Küche)
- **Hooks**: `useSkills`, `useDienstplan` für CRUD

## Küchenplan Dual-View mit Paint-Mode

### Status: ✅ Implementiert

### Was wurde gebaut

- **Neue Route** `/kueche-plan` (Admin-only, globale Route ohne Restaurant-Kontext)
- **Seite** `src/pages/KuechePlan.tsx`: Zeigt beide Restaurants (Spicery + YUM) untereinander mit je einem MonthlyGrid
- **Paint-Mode Toolbar**: Küchen-Skills (VS, PASS, SPÜLEN, CO) als farbige ToggleGroup-Buttons + Löschen-Button
- **MonthlyGrid erweitert**: Neue Props `restaurantIdOverride`, `activeSkillId`, `deleteMode`
- **ShiftCell erweitert**: Paint-Mode — Klick auf leere Zelle weist aktiven Skill zu, Klick auf belegte Zelle löscht sie
- **Navigation**: "Küchenplan" unter Planung in GlobalLayout-Sidebar
- **Konflikterkennung**: Amber-Marker bei Doppelbelegung über Standorte hinweg

### Nächste Schritte

- Employee-Skills zuweisen (UI in Mitarbeiterverwaltung)
- AbsenceDialog für mehrtägige Abwesenheiten

## Datenbankarchitektur-Optimierung für Skalierbarkeit

### Status: ✅ Implementiert

### Was wurde gebaut

- **5 Indexes**: `idx_zt_shifts_week`, `idx_zt_shifts_date`, `idx_sessions_date`, `idx_kitchen_shifts_staff`, `idx_waiter_shifts_staff`
- **Cleanup-Funktion**: `cleanup_old_records()` löscht login_confirmations (>7d) und auth_attempts (>90d)
- **pg_cron Job**: Cleanup täglich um 3:00 Uhr
- **Materialized View**: `mv_daily_summary` mit täglichen Zusammenfassungen (Umsatz, Gäste, Kellner, Stunden, Ausgaben)
- **pg_cron Job**: View-Refresh täglich um 4:00 Uhr (`REFRESH MATERIALIZED VIEW CONCURRENTLY`)
- **Sicherheit**: Öffentlicher API-Zugriff auf View gesperrt (nur service_role)

### Nächste Schritte

- AI-Chat auf `mv_daily_summary` umstellen wenn Performance-Probleme bei >1.000 Sessions auftreten
