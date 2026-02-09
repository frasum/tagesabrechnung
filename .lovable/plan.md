

# Sessions aelter als 3 Tage: Nur Admin darf bearbeiten

## Uebersicht

Sessions/Abrechnungen, deren Datum mehr als 3 Tage in der Vergangenheit liegt, werden fuer alle Nutzer ausser Admins in einen Nur-Lesen-Modus versetzt. Eingabeformulare, Buttons zum Hinzufuegen/Loeschen und Bearbeitungsfunktionen werden ausgeblendet oder deaktiviert.

## Betroffene Seiten

| Seite | Pfad | Bearbeitungsfunktionen |
|-------|------|----------------------|
| Kellner Abrechnung | `/` (WaiterCashUp) | Kellner hinzufuegen, bearbeiten, loeschen |
| Tagesabrechnung | `/summary` (DailySummary) | Session-Felder bearbeiten, Ausgaben/Vorschuesse hinzufuegen/loeschen |
| Kuechen Trinkgeld | `/kitchen` (KitchenTipSplit) | Kuechenschichten hinzufuegen/loeschen |

## Technische Umsetzung

### 1. Neue Hilfsfunktion: `isSessionLocked`

Datei: `src/utils/businessDate.ts` (bestehende Datei erweitern)

```text
function isSessionLocked(sessionDate: Date, permissionLevel: PermissionLevel): boolean
```

Prueft ob das Session-Datum mehr als 3 Tage zurueckliegt UND der Nutzer kein Admin ist. Verwendet `getBusinessDate()` als Referenz fuer "heute".

### 2. WaiterCashUp (`src/pages/WaiterCashUp.tsx`)

- `useAuth()` importieren um `permissionLevel` zu erhalten
- `isSessionLocked()` mit `selectedDate` und `permissionLevel` aufrufen
- Wenn gesperrt:
  - Eingabeformular (Kellner hinzufuegen/bearbeiten Card) ausblenden
  - Loeschen-Buttons in der Tabelle ausblenden
  - Tabellenzeilen nicht klickbar machen (kein `handleEditWaiter`)
  - Hinweisbanner anzeigen: "Diese Abrechnung ist aelter als 3 Tage und kann nur von einem Admin bearbeitet werden."

### 3. DailySummary (`src/pages/DailySummary.tsx`)

- `isSessionLocked()` aufrufen (nutzt bereits `useAuth`)
- Wenn gesperrt:
  - Alle `CurrencyInput` und `Textarea` Felder auf `disabled` setzen
  - Ausgaben-/Vorschuss-Formulare (Hinzufuegen-Buttons) deaktivieren
  - Loeschen-Buttons fuer Ausgaben/Vorschuesse ausblenden
  - Session-Erstellung bleibt moeglich (fuer Tage ohne Session)
  - PDF-Export bleibt verfuegbar (nur Lesen)
  - Hinweisbanner anzeigen

### 4. KitchenTipSplit (`src/pages/KitchenTipSplit.tsx`)

- `useAuth()` importieren
- `isSessionLocked()` aufrufen
- Wenn gesperrt:
  - Kuechenschicht-Formular (Hinzufuegen) ausblenden
  - Loeschen-Buttons in der Tabelle ausblenden
  - Hinweisbanner anzeigen

### 5. Hinweisbanner-Komponente

Ein einheitliches Banner mit Warnsymbol und Text, das auf allen drei Seiten angezeigt wird wenn die Session gesperrt ist. Wird als einfaches `Card`-Element mit `AlertTriangle`-Icon umgesetzt.

## Logik-Details

- "3 Tage" bedeutet: Geschaeftsdatum heute minus Session-Datum > 3 Tage
- Admins koennen immer bearbeiten, unabhaengig vom Alter
- Manager und Staff sehen den Nur-Lesen-Modus
- Die Sperre ist rein clientseitig (UI-Einschraenkung), keine serverseitige Aenderung noetig, da die bestehenden RLS-Policies keine Zeitbeschraenkung haben

