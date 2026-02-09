

# Aenderungszeitpunkt bei Kellnern im PDF anzeigen

## Ziel

Im PDF-Export auf Seite 2 soll bei jedem Kellner angezeigt werden, ob und wann eine Aenderung an seinen Daten vorgenommen wurde. Die "Abgabe"-Spalte zeigt bereits die Erstabgabe-Zeit (`submitted_at`). Zusaetzlich soll eine Aenderungszeit sichtbar sein, falls die Daten nachtraeglich bearbeitet wurden.

## Ansatz

Da `submitted_at` bei jedem Speichern (Erstabgabe und Aenderung) ueberschrieben wird, gibt es derzeit keine Moeglichkeit zwischen Erstabgabe und Aenderung zu unterscheiden. Loesung: Eine neue Spalte `updated_at` hinzufuegen, die nur bei Updates gesetzt wird.

## Technische Aenderungen

### 1. Datenbank-Migration

Neue Spalte `updated_at` in der Tabelle `waiter_shifts`:
- Typ: `timestamp with time zone`, nullable, default `null`
- Wird nur bei UPDATE gesetzt (nicht bei INSERT)
- Automatischer Trigger: Bei jedem UPDATE wird `updated_at = now()` gesetzt

### 2. Datei: `src/utils/pdfExport.ts`

**WaiterShift-Interface erweitern:**
- Neues optionales Feld `updated_at?: string | null`

**Kellner-Tabelle erweitern:**
- Neue Spalte "Geaend." (Geaendert) in der Tabelle
- Zeigt die Uhrzeit der letzten Aenderung an, falls vorhanden
- Wenn `updated_at` vorhanden ist: Uhrzeit im Format `HH:mm` anzeigen
- Wenn nicht: leerer Wert `---`
- Tabellen-Header wird: `['Kellner', 'Umsatz', 'Abgabe', 'Geaend.', 'TG', 'TG %']`

### 3. Datei: `src/pages/DailySummary.tsx`

- `updated_at` aus den Waiter-Shift-Daten an die PDF-Export-Daten weitergeben (analog zu `submitted_at`)

### 4. Datei: `src/hooks/useSession.ts` und `src/hooks/useWaiterShiftAudit.ts`

- Beim **Update** einer Kellner-Schicht wird `updated_at` nicht manuell gesetzt, da der Datenbank-Trigger dies automatisch uebernimmt
- Beim **Insert** bleibt `updated_at` auf `null`

## Seitenaufteilung Seite 2 (aktualisiert)

| Kellner | Umsatz | Abgabe | Geaend. | TG | TG % |
|---------|--------|--------|---------|----|------|
| Max     | 850,00 EUR | 23:15 | ---   | 45,00 EUR | 3,2% |
| Lisa    | 720,00 EUR | 22:50 | 23:30 | 38,00 EUR | 3,1% |

Lisa hat ihre Daten um 22:50 abgegeben und um 23:30 nochmal geaendert.

