

## Plan: Alle Webhook-Funktionen entfernen

### Betroffene Komponenten

1. **Edge Function `send-settlement`** — sendet Abrechnungsdaten an ein externes System
2. **Edge Function `notify-pdf-export`** — sendet Telegram-Benachrichtigung bei PDF-Export
3. **Client-Code in `DailySummary.tsx`** — ruft beide Funktionen auf

### Umsetzung

**1. Edge Functions löschen**
- `supabase/functions/send-settlement/index.ts` löschen
- `supabase/functions/notify-pdf-export/index.ts` löschen

**2. Config bereinigen** (`supabase/config.toml`)
- Einträge `[functions.send-settlement]` und `[functions.notify-pdf-export]` entfernen

**3. Client-Code bereinigen** (`src/pages/DailySummary.tsx`)
- Zeilen 403 (`settlementSentRef`) entfernen
- Zeilen 414–441 entfernen (beide `supabase.functions.invoke`-Aufrufe für `notify-pdf-export` und `send-settlement`)
- `useCallback`-Dependencies entsprechend bereinigen (`settings?.show_pdf_export_notification`, `session` entfernen)

**4. Telegram-Einstellungen: PDF-Toggle entfernen**
- In `src/pages/TelegramSettings.tsx`: den Eintrag `show_pdf_export_notification` aus `metricToggles` entfernen
- In `src/hooks/useTelegramSettings.ts`: das Feld aus Interface und Payload entfernen

### Nicht betroffen
- Die `send-telegram-summary` Edge Function (Tagesbericht) ist kein Webhook, sondern sendet direkt an die Telegram API — bleibt bestehen
- Die Datenbankspalte `last_settlement_sent_at` in `sessions` kann bestehen bleiben (keine Breaking Changes)

