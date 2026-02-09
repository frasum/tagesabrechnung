
# QR-Poster in die Sidebar verschieben und aus der Mitarbeiterverwaltung entfernen

## Uebersicht
Die QR-Poster-Funktion (Kellner Self-Service) wird als eigenstaendiger Navigationspunkt in die Sidebar verschoben. Da sie dort erreichbar ist, wird die `WaiterQRCode`-Komponente von der Mitarbeiterverwaltungsseite (`/staff`) entfernt.

## Aenderungen

### 1. QR-Poster von der Mitarbeiterverwaltung entfernen (`src/pages/StaffManagement.tsx`)
- Import von `WaiterQRCode` entfernen (Zeile 12)
- Die Komponente `<WaiterQRCode />` in Zeile 174 entfernen

### 2. Sidebar-Navigation erweitern (`src/components/layout/AppLayout.tsx`)
- `QrCode`-Icon aus lucide-react importieren
- Neuen Eintrag in `allNavItems` hinzufuegen:
  - Pfad: `qr-poster`
  - Label: `QR-Poster`
  - Icon: `QrCode`
  - minLevel: `manager`

### 3. Berechtigungen ergaenzen (`src/types/permissions.ts`)
- `NAV_PERMISSIONS` um den Eintrag `'qr-poster'` erweitern mit Label "QR-Poster", Beschreibung "Kellner Self-Service Poster", minLevel `manager`
- `MANAGER_NAV_ITEMS` um `{ path: 'qr-poster', label: 'QR-Poster' }` erweitern, damit Admins die Sichtbarkeit pro Manager steuern koennen

### 4. Route absichern (`src/App.tsx`)
- Die bestehende Route `qr-poster` (Zeile 49) mit `ProtectedRoute requiredLevel="manager"` umschliessen (aktuell ist sie ungeschuetzt)

## Ergebnis
- QR-Poster ist ueber die Sidebar erreichbar (fuer Manager und Admins)
- Die Mitarbeiterverwaltungsseite wird aufgeraeumt
- Admins koennen die Sichtbarkeit pro Manager in `/permissions` konfigurieren
