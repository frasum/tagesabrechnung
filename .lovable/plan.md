
# Ergänzung der fehlenden Felder aus der Excel

## Identifizierte fehlende Felder

Nach dem Vergleich der Excel-Datei mit der aktuellen App-Implementierung fehlen folgende Felder:

| Excel-Feld | Status | Beschreibung |
|------------|--------|--------------|
| **take away gesamt** | FEHLT | Summe aller Take-Away-Umsätze (aus Excel Zeile 131) |
| **KK GL** (Kreditkarten Gesamtliste) | FEHLT | Gesamtübersicht der Kartentransaktionen mit Aufschlüsselung |
| **gl** (Gesamtumsatz vom Spicery-System) | TEILWEISE | Existiert als `spicery_counter`, wird aber anders verwendet |
| **transaktionen** | FEHLT | Anzahl der Transaktionen vom Spicery-System |

---

## Geplante Umsetzung

### 1. Datenbank-Migration

Neue Spalten in der `sessions`-Tabelle hinzufügen:

```text
takeaway_total        NUMERIC DEFAULT 0  -- Take-Away Gesamtumsatz
spicery_transactions  NUMERIC DEFAULT 0  -- Anzahl Spicery-Transaktionen  
card_total_gl         NUMERIC DEFAULT 0  -- KK Gesamtliste (zum Abgleich)
```

### 2. UI-Anpassungen

**Manager Dashboard** (`src/pages/ManagerDashboard.tsx`):
- Neues Eingabefeld "Take-Away Gesamt" in der Lieferplattformen-Karte
- Neues Eingabefeld "Spicery Transaktionen" in der POS & Terminal-Karte
- Neues Eingabefeld "KK Gesamtliste" in der POS & Terminal-Karte (zum Abgleich mit Kellner-Kartensummen)

**Tagesabrechnung** (`src/pages/DailySummary.tsx`):
- Take-Away Gesamt in der Einnahmen-Übersicht anzeigen
- KK GL als Abgleichswert bei den Kartenzahlungen anzeigen
- Spicery Transaktionen in der Übersicht anzeigen

### 3. Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/migrations/...` | Neue Spalten hinzufügen |
| `src/types/database.ts` | Session-Interface erweitern |
| `src/pages/ManagerDashboard.tsx` | 3 neue Eingabefelder |
| `src/pages/DailySummary.tsx` | Neue Werte in Übersichten anzeigen |
| `src/hooks/useSession.ts` | Neue Felder im Update-Hook |
| `src/utils/pdfExport.ts` | PDF-Export mit neuen Feldern |

---

## Technische Details

### Datenbank-Migration SQL

```sql
ALTER TABLE public.sessions
ADD COLUMN takeaway_total NUMERIC DEFAULT 0,
ADD COLUMN spicery_transactions NUMERIC DEFAULT 0,
ADD COLUMN card_total_gl NUMERIC DEFAULT 0;
```

### TypeScript-Interface Erweiterung

```typescript
export interface Session {
  // ... bestehende Felder ...
  takeaway_total: number;
  spicery_transactions: number;
  card_total_gl: number;
}
```

### BARGELD-Formel Anpassung

Die Take-Away-Umsätze werden als Teil der Lieferplattformen behandelt und in die Abzüge einbezogen:

```text
BARGELD = Kellner Umsatz + Gutschein VK + Sonstige Einnahmen + Hilf Mahl
        - Terminal 1 - Terminal 2 - OpenTabs - Gutschein EL 
        - Vorschuss - Einladung - Offene Rechnungen - Ausgaben
        - Lieferplattformen - FineDine - Take-Away Gesamt
```

### Neue Validierung

KK GL kann mit der Summe der Kellner-Kartenzahlungen verglichen werden, um Differenzen anzuzeigen (ähnlich wie bei POS/Terminal-Differenz).
