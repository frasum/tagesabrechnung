

## Fix: Trinkgeld-Pool Berechnung korrigieren

### Das Problem

Die UI berechnet den "erwarteten Barbetrag" eines Kellners mit `kassiert_brutto`, aber die Datenbank (Generated Column) verwendet korrekt `pos_sales`. Wenn `kassiert_brutto` und `pos_sales` unterschiedlich sind (z.B. bei Mo: 1130,50 vs 1678,90), wird der Pool-Beitrag falsch berechnet.

- Korrekt (DB-Formel): **93 Euro pro Kellner**
- Falsch (UI-Formel): 227 Euro pro Kellner

### Ursache

In `WaiterCashUp.tsx` (Zeile 195-203):

```text
// FALSCH: benutzt kassiert_brutto
const calculateExpected = (shift) => {
  return kassiert_brutto + hilf_mahl - open_invoices - card_total;
};

// RICHTIG: sollte pos_sales benutzen (wie die DB)
const calculateExpected = (shift) => {
  return pos_sales + hilf_mahl - open_invoices - card_total;
};
```

Oder noch besser: direkt die DB-Werte `differenz` und `kitchen_tip` verwenden, da diese als Generated Columns immer korrekt sind.

### Aenderungen

**1. WaiterCashUp.tsx** -- Pool-Berechnung korrigieren
- `calculateExpected`: `kassiert_brutto` durch `pos_sales` ersetzen
- `calculateContribution`: Direkt die DB-gespeicherte `differenz` und `kitchen_tip` verwenden statt neu zu berechnen
- Vorschau-Berechnung im Formular (Zeile 368, 380) ebenfalls anpassen
- Formel-Beschriftung "Erwartet" aktualisieren

**2. WaiterMobile.tsx** -- Falls gleiche Berechnung vorhanden, ebenfalls korrigieren

**3. DailySummary.tsx** -- Falls Pool dort auch berechnet wird, gleiche Korrektur

**4. useMonthlyStaffTips.ts** -- Gleicher Bug: Zeile 93 benutzt `differenz` aus der DB (korrekt), aber in anderen Hooks koennte die falsche Formel existieren

**5. useWaiterRanking.ts** -- Zeile 409-412: benutzt `kassiert_brutto` in der Contribution-Berechnung, muss auf `pos_sales` umgestellt werden

### Zusammenfassung

| Datei | Problem | Fix |
|---|---|---|
| WaiterCashUp.tsx | `kassiert_brutto` statt `pos_sales` | Formel korrigieren oder DB-Werte nutzen |
| useSession.ts (useWaiterTipAverages) | Gleiche falsche Formel | `pos_sales` verwenden |
| useWaiterRanking.ts | Gleiche falsche Formel | `pos_sales` verwenden |
| WaiterMobile.tsx | Pruefen ob gleiche Berechnung | Falls ja, korrigieren |

