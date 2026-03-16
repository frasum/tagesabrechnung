
## Dienstplan – 2 Pläne pro Standort (Küche + Service/GL)

### Status: ✅ Implementiert

### Was wurde gebaut

- **Datenbank**: 4 neue Tabellen (`skills`, `employee_skills`, `shift_assignments`, `absences`) + `contracted_hours_per_month` auf `staff`
- **7 Seed-Skills**: VS, PASS, SPÜLEN, CO (Küche), SERVICE, BAR (Service), GL
- **Routing**: `/:restaurant/dienstplan/kueche` und `/:restaurant/dienstplan/service`
- **Sidebar**: "Dienstplan" unter Tagesgeschäft
- **Grid-UI**: Monatsansicht mit Skill-farbcodierten Zellen, Inline-Edit via Popover, Skill-Besetzungszeile (Küche)
- **Hooks**: `useSkills`, `useDienstplan` für CRUD

### Nächste Schritte

- Employee-Skills zuweisen (UI in Mitarbeiterverwaltung)
- AbsenceDialog für mehrtägige Abwesenheiten
- Dienstplan-Filter nach Skill
