
# Wechselgeldbestand durch Tresor-Seite (Excel-Struktur) ersetzen

## Uebersicht

Der Navigationspunkt "Wechselgeldbestand" wird in "Tresor" umbenannt und die Seite komplett umgebaut, sodass sie die Struktur der Excel-Tabelle abbildet: Eine einfache Tabelle mit den Spalten **Datum**, **Name**, **Einzahlung**, **Auszahlung**.

## Datenbankänderung

Die Tabelle `register_transfers` bekommt eine neue Spalte `created_by_name` (text, nullable), um den Namen der Person zu erfassen, die den Transfer durchgefuehrt hat.

## Aenderungen im Detail

### 1. Datenbank-Migration

- Neue Spalte `created_by_name` (text, nullable) in `register_transfers`

### 2. Navigation (`src/components/layout/AppLayout.tsx`)

- Label von "Wechselgeldbestand" zu "Tresor" aendern
- Icon von `ArrowUpDown` zu `Vault` aendern

### 3. Hook (`src/hooks/useRegisterTransfers.ts`)

- Interface `RegisterTransfer` um `created_by_name` erweitern
- `createTransfer` akzeptiert `created_by_name`

### 4. Seite (`src/pages/RegisterBalance.tsx`)

- Seitentitel: "Tresor" mit Untertitel "Einzahlungen und Auszahlungen"
- Oberer Bereich: Zwei kompakte Zusammenfassungs-Karten (Gesamte Einzahlungen / Gesamte Auszahlungen / Saldo)
- Hauptbereich: Tabelle mit Spalten Datum | Name | Einzahlung | Auszahlung
- Button "Neu" oeffnet den ueberarbeiteten Dialog

### 5. Transfer-Dialog (`src/components/register/TransferDialog.tsx`)

- Felder: Datum, Name (Freitext-Eingabe), Richtung (Einzahlung/Auszahlung), Betrag
- Das bisherige "Grund"-Feld wird entfernt (Name ersetzt es)

### 6. Transfer-Liste (`src/components/register/TransferList.tsx`)

- Umbau von der bisherigen Listenansicht zu einer Tabellenansicht mit den Spalten: Datum | Name | Einzahlung | Auszahlung | Loeschen-Button
- Einzahlung und Auszahlung werden in getrennten Spalten angezeigt (je nach `direction`)

### 7. RegisterCard (`src/components/register/RegisterCard.tsx`)

- Wird vereinfacht oder kann entfallen, da die Seite jetzt eine Tabelle mit Zusammenfassung zeigt

## Technische Details

- `direction: 'to_safe'` entspricht "EINZAHLUNG" (Geld geht in den Tresor)
- `direction: 'to_restaurant'` entspricht "AUSZAHLUNG" (Geld wird aus dem Tresor entnommen)
- Die bestehende Balance-Berechnung im Hook bleibt erhalten
- Die `reason`-Spalte in der Datenbank bleibt bestehen (Abwaertskompatibilitaet), wird aber im UI nicht mehr angezeigt
