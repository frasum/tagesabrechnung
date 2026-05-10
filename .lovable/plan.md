## CSV-Export für Mitarbeiterdaten

Ein neuer "Exportieren"-Button auf der Mitarbeiterverwaltung-Seite (`/staff`) lädt die aktuell sichtbare Mitarbeiterliste als CSV herunter — mit allen verfügbaren Stammdatenfeldern.

### UI

- Neuer Button **"CSV Export"** (Icon: `Download`) im Hero-Header neben "Neuer Mitarbeiter".
- Exportiert genau die Liste, die durch den aktuellen Filter (Alle / Service / Küche), die Suche und den "Inaktive anzeigen"-Toggle bestimmt wird (`filteredStaff`).
- Dateiname: `Mitarbeiter_YYYY-MM-DD.csv`.

### CSV-Format (deutsches Excel-kompatibel)

Folgt der bestehenden Konvention im Projekt (siehe Memory: Export System):
- UTF-8 mit BOM
- Semikolon (`;`) als Trennzeichen
- Werte mit `;`, `"`, oder Zeilenumbruch werden in `"..."` eingeschlossen, interne `"` verdoppelt
- Datumsfelder im Format `DD.MM.YYYY`
- Boolean als `Ja` / `Nein`
- Numerische Beträge mit Komma als Dezimaltrenner

### Spalten (alle Felder aus `staff` + Restaurant-Zuordnungen)

Persönlich: Personalnummer, Name, Vorname, Nachname, Spitzname, Geburtsdatum, Nationalität, Adresse (Straße, PLZ, Ort)

Beschäftigung: Rolle, Tätigkeit, Beschäftigungsart, Eintritt, Austritt, Aktiv, Personengruppe

Lohn: Stundenlohn, Vertragsstunden/Monat, Tip-Pool

Steuer/SV: Steuerklasse, Steuer-ID, SV-Nummer, Krankenkasse, Minijob, SV-frei

Bank: Bank, IBAN, BIC

Urlaub/Krank: Urlaub vertraglich, Vorjahr, aktuell, genommen, Krankheitstage gesamt

Restaurants: Eine Spalte "Restaurants" mit kommaseparierter Liste der zugewiesenen Restaurants inkl. Abteilung (z. B. `Spicery (service), Bottega (kitchen)`), plus optional Stundenlohn pro Restaurant.

Sonstiges: Notizen, Arbeitsbeginn

### Technische Umsetzung

1. **Neue Datei `src/utils/staffCsvExport.ts`**
   - Funktion `exportStaffToCsv(staff: Staff[], restaurants: Restaurant[]): void`
   - CSV-Helper (escape, BOM, Blob-Download — analog zu `excelExport.ts`)
   - Holt Restaurant-Zuordnungen via `staff_restaurants` (mit `restaurant_id`, `zt_department`, `zt_hourly_rate`) für die ausgewählten Staff-IDs in einer einzigen Query
   - Mappt restaurant_id → restaurant.name aus dem `useRestaurants`-Cache

2. **`src/pages/StaffManagement.tsx`**
   - Import `Download` Icon und neue Export-Funktion
   - Button im Header-Bereich neben "Neuer Mitarbeiter"
   - Handler ruft `exportStaffToCsv(filteredStaff, restaurants)` auf
   - Toast-Feedback bei Erfolg/Fehler

### Datei-Änderungen

- `src/utils/staffCsvExport.ts` (neu)
- `src/pages/StaffManagement.tsx` (Button + Handler)

### Was nicht enthalten ist

- Kein Excel/PDF (nur CSV gewünscht)
- Keine Spalten-Auswahl (alle Felder)
- Kein Server-seitiger Export (Client-seitig ausreichend, da Mitarbeiterzahl klein)