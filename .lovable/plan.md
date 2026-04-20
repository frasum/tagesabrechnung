

# Developer Checklist für Tagesabrechnung

Eine Admin-Seite mit Ampel-Bewertung (🟢 Kritisch, 🟡 Wichtig, 🔴 Unwichtig) + 🔵 „Bearbeitet" für alle Module/Edge Functions, mit Notizen, Filter, Fortschrittsbalken und Export.

## Aufbau (an `bestellung.pro` angelehnt, vereinfacht)

- **Single-Tenant**: keine `organization_id` (es gibt nur 1 Mandant). Statt Org-Scoping nur Admin-Scoping.
- **Nur Deutsch** (kein i18n, passt zur restlichen App).
- **Zugriff**: ausschließlich `admin` (`hasPermission(userLevel, 'admin')`).

## Route & Navigation

- Neue Route: `/checklist` in `src/App.tsx` unter `GlobalLayout` (admin-übergreifend, nicht restaurant-gebunden).
- Sidebar-Eintrag in Gruppe **„Verwaltung"** (`AppLayout.tsx`):
  - Label: „Checkliste", Icon: `ClipboardCheck`, `minLevel: 'admin'`.

## Datenbank (Migration)

```sql
-- Statische Feature-Bewertungen
create table public.checklist_priorities (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  feature_key text not null,
  priority text check (priority in ('green','yellow','red')) ,
  is_worked_on boolean not null default false,
  notes text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (category, feature_key)
);

-- Dynamisch registrierbare Edge Functions
create table public.checklist_edge_functions (
  id uuid primary key default gen_random_uuid(),
  function_name text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

-- Globale Notizen
create table public.checklist_settings (
  id int primary key default 1,
  notes text,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

alter table public.checklist_priorities enable row level security;
alter table public.checklist_edge_functions enable row level security;
alter table public.checklist_settings enable row level security;

-- Nur Admins lesen/schreiben (via has_role oder bestehende Admin-Prüfung)
create policy "admin all" on public.checklist_priorities
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- analog für checklist_edge_functions und checklist_settings
```

(Falls statt `has_role` eine andere Admin-RPC verwendet wird, wird die bereits existierende übernommen.)

## Statische Feature-Liste

Neue Datei `src/data/checklistFeatures.ts` mit Kategorien, die dem Tagesabrechnung-Scope entsprechen:

- **Authentifizierung & Sicherheit** (PIN, OAuth, WebAuthn, Session-Lock, RBAC, Audit-Log)
- **Kellner-Abrechnung** (PWA, Bartender-Modus, Tip-Pool, Self-Service, Zweitkellner)
- **Tagesabrechnung & Bargeld** (Cash-Balance, Carry-Over, Bankeinzahlungen, Tresor-Transfers, Vorschüsse, Kitchen-Tipp)
- **Statistiken** (Trinkgeld-Ranking, Monatsauswertung, Tip/Stunde, Restaurant-Vergleich, Lieferplattformen)
- **Zeiterfassung** (Wochenplan, Zusammenfassung, Buchhaltung, Brutto/Netto, Provision, SFN-Modi, Lohnportal, Sharing-Link, Batch-Lohnberechnung)
- **Dienstplan** (Service- & Küchenplan, Skills, Konfliktprüfung, Thaitime-Sync, monatliche Periode 26.–25.)
- **Sofortmeldung** (PDF-Export, §28a SGB IV)
- **Telegram & Benachrichtigungen** (Tagesreports, PDF-Export-Notification, Schedule)
- **Verwaltung** (Mitarbeiter, Soft-Delete, Skill-Farben, Berechtigungen, Restaurant-Customization)
- **PWA & Updates** (Service Worker, Manual Update Button, Mobile Layout)
- **AI-Features** (Restaurant-Chat, Voice-Assistant, Payroll-OCR)

## Edge Functions

Initial-Seed (Insert in Migration) aller in `supabase/functions/` vorhandenen Functions:
`admin-link-account`, `calculate-payroll`, `create-login-confirmation`, `elevenlabs-stt`, `elevenlabs-tts`, `link-account`, `manage-nav-permissions`, `manage-user-role`, `manage-webauthn`, `notify-pdf-export`, `parse-payroll-pdf`, `payroll-office-auth`, `payroll-office-data`, `restaurant-chat`, `send-telegram-summary`, `shared-zt-data`, `sync-thaitime-staff`, `update-pin`, `update-telegram-schedule`, `validate-pin`, `verify-login-confirmation`, `verify-session-pin`, `webauthn-authenticate`, `webauthn-register`.

Im Dialog „Function hinzufügen" können Admins später neue eintragen.

## Hooks (`src/hooks/useChecklist.ts`)

- `useChecklistPriorities()` – mit Realtime-Subscription auf `checklist_priorities`
- `useUpsertPriority()` – setzt/löscht Ampel
- `useToggleWorkedOn()` – schaltet 🔵 um
- `useUpdateFeatureNotes()` – Notiz pro Feature
- `useBulkSetCategory()` – setzt Kategorie auf eine Farbe
- `useChecklistSettings()` / `useUpdateGlobalNotes()`
- `useChecklistEdgeFunctions()` / `useAddEdgeFunction()`

## UI (`src/pages/Checklist.tsx`)

- Card mit Titel „Entwickler-Checkliste" + Beschreibung
- Buttons **PDF-Export** und **JSON-Export** (Reuse `jspdf` + `jspdf-autotable`, bereits im Projekt vorhanden)
- **Allgemeine Notizen** (Collapsible Textarea, autosave on blur)
- **Stats-Badges** (klickbar als Filter): Kritisch / Wichtig / Unwichtig / Bearbeitet / Nicht bewertet
- **Fortschrittsbalken** „% bewertet"
- **Accordion** pro Kategorie:
  - Header: Name, Counts pro Farbe, „Bearbeitet"-Count, Gesamt
  - Bulk-Aktionen (alle 🟢/🟡/🔴), bei Edge Functions zusätzlich „Function hinzufügen"-Dialog
  - Feature-Reihen mit 3 Ampel-Buttons + 🔵 + Label + Notiz-Toggle (Inline-Input, autosave)

Komponenten exakt nach `bestellung.pro`-Vorbild (`PriorityButton`, `WorkedOnButton`, `FeatureRow`, `AddEdgeFunctionDialog`), nur ohne i18n.

## Export (`src/lib/checklistExport.ts`)

- `exportChecklistPdf(priorities, edgeFunctions, globalNotes)` – Tabelle pro Kategorie mit Farbe + Status + Notizen
- `exportChecklistJson(...)` – Download `.json`

## Was nicht passiert

- Keine Änderungen an Bargeld-/Zeiterfassungs-Logik
- Keine Änderungen an bestehenden Routen/Layouts außer einem neuen Sidebar-Eintrag und einer neuen Route
- Kein i18n, kein Multi-Tenant

