
# Restaurant-spezifische Labels

## Ziel
Jedes Restaurant (z.B. Spicery, YUM) soll eigene Bezeichnungen fuer Felder wie "SoUse", "Wolt", "Umsatz Abschlag" etc. festlegen koennen. Die Labels werden in der Datenbank pro Restaurant gespeichert und ueberall in der App (UI, PDF-Export, Excel-Export) verwendet.

## Konzept

Standardmaessig werden die aktuellen Labels beibehalten. Ueber eine Einstellungsseite kann ein Manager/Admin die Labels pro Restaurant ueberschreiben. Nicht ueberschriebene Labels behalten ihren Standardwert.

## Technische Umsetzung

### 1. Datenbank - Settings-Tabelle nutzen
Die bestehende `settings`-Tabelle wird verwendet mit einem neuen Key `label_overrides` pro Restaurant:

```json
{
  "key": "label_overrides",
  "restaurant_id": "<restaurant-uuid>",
  "value": {
    "ordersmart_revenue": "SoUse",
    "wolt_revenue": "Wolt",
    "pos_total": "Umsatz Abschlag",
    "takeaway_total": "Takeaway Abschlag",
    "terminal_1": "Terminal 1",
    "terminal_2": "Terminal 2",
    "card_total_gl": "GL Kredit Karten",
    "vouchers_sold": "Gutschein Verkauf",
    "vouchers_redeemed": "Gutschein Eingeloest",
    "finedine_vouchers": "FineDine",
    "einladung": "Einladung",
    "sonstige_einnahme": "Sonstige Einnahmen",
    "kassiert_brutto": "Abzugebender Betrag",
    "pos_sales": "Leistung",
    "open_invoices": "Offene Rechnung",
    "hilf_mahl": "Hilf Mahl",
    "cash_handed_in": "Abgegebenes Bargeld",
    "kitchen_tip": "Trinkgeld fuer Kueche"
  }
}
```

### 2. Neuer Hook: `useLabels`
- Laedt die `label_overrides` aus der Settings-Tabelle fuer das aktuelle Restaurant
- Stellt eine Funktion `getLabel(fieldKey)` bereit, die den ueberschriebenen oder den Standard-Wert zurueckgibt
- Definiert alle Standard-Labels zentral in einer Map

### 3. Label-Verwaltung in den Einstellungen
- Neuer Bereich auf der bestehenden Einstellungsseite oder im Manager-Dashboard
- Tabelle mit allen verfuegbaren Labels: links der Feld-Name, rechts ein editierbares Textfeld
- Speichern-Button, der die Aenderungen in die `settings`-Tabelle schreibt

### 4. Integration in bestehende Komponenten
Folgende Dateien werden angepasst, um `getLabel()` statt hartcodierter Strings zu verwenden:

- **`src/components/daily-summary/layouts/ExcelLayout.tsx`** - Alle Zeilen-Labels (Umsatz Abschlag, Terminal 1/2, SoUse, Wolt, etc.)
- **`src/pages/WaiterCashUp.tsx`** - Tabellenkopf und Formular-Labels (Leistung, Abzugebender Betrag, Offene Rechnung, etc.)
- **`src/utils/pdfExport.ts`** - PDF-Export-Labels
- **`src/utils/excelExport.ts`** - Excel-Export-Spaltennamen
- **`src/hooks/useCashBalanceData.ts`** / **`src/components/cash-balance/CashBalanceSummary.tsx`** - Bargeldbestand-Labels
- **`src/hooks/useStatistics.ts`** - Statistik-Beschriftungen (z.B. "OrderSmart" in Delivery-Breakdown)

### 5. Ablauf

1. Hook `useLabels(restaurantId)` wird in relevanten Komponenten aufgerufen
2. Beim ersten Laden werden Standard-Labels verwendet, bis die DB-Daten geladen sind
3. Ueberschriebene Labels ersetzen die Standards
4. Bei PDF/Excel-Export werden die Labels als Parameter uebergeben

### Betroffene Dateien (Aenderungen)
| Datei | Aenderung |
|---|---|
| `src/hooks/useLabels.ts` | **Neu** - Hook mit Standard-Labels und DB-Abfrage |
| `src/components/settings/LabelSettings.tsx` | **Neu** - UI zur Label-Verwaltung |
| `src/components/daily-summary/layouts/ExcelLayout.tsx` | Labels durch `getLabel()` ersetzen |
| `src/pages/WaiterCashUp.tsx` | Labels durch `getLabel()` ersetzen |
| `src/utils/pdfExport.ts` | Labels-Map als Parameter akzeptieren |
| `src/utils/excelExport.ts` | Labels-Map als Parameter akzeptieren |
| `src/pages/DailySummary.tsx` | Labels an Exports weiterreichen |
| `src/pages/ManagerDashboard.tsx` oder Einstellungsseite | Link zur Label-Verwaltung |
