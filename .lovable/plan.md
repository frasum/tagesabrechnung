

## Mitarbeiter-Datenkartei im Lohnbüro-Portal

### Übersicht
Beim Klick auf einen Mitarbeiternamen im Lohnbüro-Portal öffnet sich ein Dialog mit der vollständigen Lohnabrechnungsdatenkartei. Die Daten sind dort auch bearbeitbar.

### Änderungen

#### 1. Edge Function erweitern (`supabase/functions/payroll-office-data/index.ts`)

**Mehr Felder bei employees laden:**
Die bestehende `staff`-Abfrage um alle lohnrelevanten Felder erweitern:
- `date_of_birth`, `employment_start`, `employment_end`
- `hourly_rate`, `contracted_hours_per_month`
- `tax_id`, `tax_class`, `social_security_nr`
- `health_insurance`, `nationality`, `personnel_group`
- `is_minijob`, `is_sv_exempt`
- `vacation_days_contractual`, `vacation_days_current`, `vacation_days_previous`, `vacation_days_taken`
- `sick_days_total`

**Neue Action `update_staff`:**
Ermöglicht das Bearbeiten der Stammdaten über das Portal (PIN-gesichert wie alle anderen Actions).

#### 2. PayrollPortal erweitern (`src/pages/shared/PayrollPortal.tsx`)

**Neue Komponente `StaffDetailDialog`:**
- Dialog öffnet sich bei Klick auf Mitarbeiternamen (in allen Tabs: Wochenplan, Zusammenfassung, Buchhaltung)
- Zeigt alle Stammdaten in übersichtlichen Sektionen:
  - **Persönliche Daten**: Name, Vorname, Nachname, Geburtsdatum, Nationalität
  - **Beschäftigung**: Perso-Nr, Rolle, Eintrittsdatum, Austrittsdatum, Personalgruppe
  - **Vergütung**: Stundenlohn, Vertragsstunden/Monat, Minijob, SV-befreit
  - **Steuer/SV**: Steuer-ID, Steuerklasse, SV-Nummer, Krankenkasse
  - **Urlaub/Krankheit**: Vertragliche Urlaubstage, aktuell, Vorjahr, genommen, Krankheitstage gesamt
- Alle Felder sind editierbar (Input-Felder)
- Speichern-Button ruft die neue `update_staff` Action auf

**Klickbare Mitarbeiternamen:**
- In allen Tabs (Wochenplan, Zusammenfassung, Buchhaltung) werden die Mitarbeiternamen klickbar gemacht (`cursor-pointer`, `hover:underline`)
- Klick öffnet den `StaffDetailDialog`

### Technische Details
- 2 Dateien: Edge Function + PayrollPortal
- Dialog verwendet bestehende UI-Komponenten (Dialog, Input, Label, Switch)
- Speichern über die Edge Function (PIN-Validierung wie bei allen anderen Actions)
- Nach dem Speichern: Query-Invalidierung für automatisches Refresh

