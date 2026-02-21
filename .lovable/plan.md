

# Telegram-Bargeldberechnung mit Web-App synchronisieren

## Problem
Die Telegram-Funktion (`send-telegram-summary`) berechnet Bargeld und Wechselgeldbestand OHNE die Tabelle `register_transfers` zu beruecksichtigen. Die Web-App (`useCashBalanceData`) bezieht diese Transfers jedoch ein. Dadurch weichen die Telegram-Werte von der Tagesabrechnung ab.

Zusaetzlich ignoriert der Hook `usePreviousDayDeficit` (genutzt auf der Tagesabrechnung fuer den Fehlbetrag Vortag) ebenfalls die `register_transfers` und hat ein 30-Tage-Lookback-Limit.

## Loesung

### 1. Telegram Edge Function: `register_transfers` einbauen

**Datei:** `supabase/functions/send-telegram-summary/index.ts`

In der Funktion `calculateCashBalance`:
- Zusaetzlich `register_transfers` fuer das Restaurant laden
- Pro Tag den Transfer-Effekt berechnen (`to_restaurant` = +, `to_safe` = -)
- In die `rawBargeld`-Berechnung einrechnen (analog zu `useCashBalanceData`)

Aenderung in der Bargeld-Zeile:
```text
// NEU: Transfer-Effekt pro Tag
const dayTransfers = transfers.filter(t => t.transfer_date === session.session_date);
const transferEffect = dayTransfers.reduce((sum, t) => {
  return t.direction === 'to_restaurant' ? sum + Number(t.amount) : sum - Number(t.amount);
}, 0);

const rawBargeld = tagesumsatz + gutscheineVK + sonstigeEinnahme
  - kreditkarten - ordersmart - wolt - gutscheineEL - finedine - einladung
  - totalOpenInvoices - vorschuss - totalExpenses
  + transferEffect;  // <-- NEU
```

### 2. `usePreviousDayDeficit` Hook: `register_transfers` einbauen

**Datei:** `src/hooks/usePreviousDayDeficit.ts`

- `register_transfers` fuer das Restaurant laden (gefiltert auf den Lookback-Zeitraum)
- Pro Session den Transfer-Effekt in die Bargeld-Berechnung einrechnen
- 30-Tage-Lookback-Limit beibehalten (Performance), da aeltere Defizite ohnehin aufgeloest sein sollten

### 3. Keine Aenderungen noetig

- `useCashBalanceData` - bereits korrekt
- `useRemainingCash` - nutzt `useCashBalanceData`, daher korrekt
- `ExcelLayout` / `DailySummary` UI - keine Aenderungen noetig

## Zusammenfassung der Dateien

| Datei | Aenderung |
|---|---|
| `supabase/functions/send-telegram-summary/index.ts` | `register_transfers` laden und in Bargeld-Berechnung einbeziehen |
| `src/hooks/usePreviousDayDeficit.ts` | `register_transfers` laden und in Deficit-Chaining einbeziehen |

