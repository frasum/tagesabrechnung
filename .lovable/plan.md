## Problem

- Klick auf **Dienstplan** → öffnet die Seite mit der gewohnten Haupt-Sidebar (`AppLayout`), Navigation bleibt unverändert.
- Klick auf **Küchenplan** → die Seite wechselt zu `GlobalLayout` (Verwaltungs-Sidebar mit "Zurück zur App", nur Mitarbeiter / Berechtigungen / Küchenplan / Farben). Dadurch wirkt die Navigation komplett anders.

Ursache: `src/pages/KuechePlan.tsx` umschließt seinen Inhalt mit `<GlobalLayout>` statt mit `<AppLayout>` wie `DienstplanLayout.tsx`.

## Lösung

Den Küchenplan auf dasselbe Layout wie den Dienstplan umstellen, damit die Sidebar identisch bleibt.

### Änderung

**`src/pages/KuechePlan.tsx`**
- Import `GlobalLayout` ersetzen durch `AppLayout` (`@/components/layout/AppLayout`).
- `<GlobalLayout> … </GlobalLayout>` durch `<AppLayout> … </AppLayout>` ersetzen.
- Inhalt (Header, Period-Switcher, Paint-Toolbar, Restaurant-Schleife mit `MonthlyGrid`) bleibt unverändert.

### Ergebnis

Beim Wechsel zwischen Dienstplan und Küchenplan bleibt die linke Navigationsleiste exakt gleich (Restaurant-Switcher oben, gruppierte Navigation Tagesgeschäft / Auswertung / Planung / Verwaltung, aktiver Eintrag „Küchenplan" in der Gruppe „Planung" markiert).