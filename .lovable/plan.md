

## Problem

Die Berechtigungsseite (`/permissions`) bleibt im Ladezustand hängen. Die Backend-Funktion `manage-nav-permissions` startet zwar, beendet aber nie ihre Ausführung (Timeout). Die Ursache ist eine nicht gepinnte Bibliotheks-Version im Import, die beim Laden hängenbleibt.

## Lösung

Die Backend-Funktion `manage-nav-permissions` muss aktualisiert werden, um denselben Import-Stil wie die anderen funktionierenden Funktionen zu verwenden:

### Schritt 1: Edge Function Import korrigieren

In `supabase/functions/manage-nav-permissions/index.ts`:
- Import von `https://esm.sh/@supabase/supabase-js@2` auf `https://esm.sh/@supabase/supabase-js@2.38.4` pinnen (wie bei `validate-pin`)
- `Deno.serve` beibehalten (das funktioniert), nur den Import fixenx

### Technischer Hintergrund

Andere funktionierende Edge Functions (z.B. `validate-pin`) verwenden eine gepinnte Version `@2.38.4`. Die `manage-nav-permissions`-Funktion importiert `@2` ohne feste Version, was zu einem Timeout beim Modulauflösung führen kann.

