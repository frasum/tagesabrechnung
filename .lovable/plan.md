

## Plan: Lohnica Brutto-Netto-API in dieses Projekt integrieren

### Übersicht

Die bestehende Edge Function `calculate-payroll` wird umgebaut, um die externe **brutto-netto-api.de** (Lohnica) zu nutzen — genau wie in [Time Keeper Pro](/projects/ffcf6058-b265-45a3-85d0-4dba94f01692). Die bisherige interne Berechnung bleibt als Fallback erhalten.

### 1. Secret hinzufügen

- `BRUTTO_NETTO_API_KEY` muss als Secret konfiguriert werden (fehlt aktuell)
- Optional: `BRUTTO_NETTO_API_URL` (Default: `https://brutto-netto-api.de`)

### 2. Edge Function `calculate-payroll` umbauen

Die bestehende Logik wird zur Fallback-Funktion. Neuer Hauptpfad:

1. Eingehenden Request auf Lohnica-Format mappen (Bundesland → Kürzel, Steuerklasse, KV-Art, Kinderfreibeträge, etc.)
2. Externe API aufrufen: `POST /api/v1/gross-net-calc/{year}-{month}` mit `X-API-Key` Header
3. Response auf bestehendes `PayrollResult`-Format mappen
4. SFN-Zuschläge weiterhin lokal berechnen (API kennt keine Gastro-Zuschläge)
5. Bei API-Fehler/Timeout → Fallback auf interne Berechnung, mit `source: "fallback"` markiert

### 3. Frontend anpassen (`ZtBruttoNetto.tsx`)

- `PayrollResult`-Typ um `source?: 'api' | 'fallback'` erweitern
- Payload um `calculation-year` und `calculation-month` ergänzen (aus Datumsauswahl)
- Hinweis anzeigen ob Ergebnis von externer API oder Fallback stammt
- Bundesland-Mapping auf API-Kürzel (Bayern → `by`, etc.) in der Edge Function

### 4. Typen erweitern (`src/types/payroll.ts`)

- `source` Feld zu `PayrollResult` hinzufügen
- `agUmlagen` Feld hinzufügen (Lohnica liefert U1, U2, Insolvenzumlage)

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/calculate-payroll/index.ts` | API-Proxy + Fallback + Response-Mapping |
| `src/pages/zeiterfassung/ZtBruttoNetto.tsx` | Source-Anzeige, Jahr/Monat im Payload |
| `src/types/payroll.ts` | `source`, `agUmlagen` Felder |

### Voraussetzung

Der `BRUTTO_NETTO_API_KEY` wird vor der Implementierung abgefragt.

