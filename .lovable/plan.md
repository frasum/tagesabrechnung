

# Plan: Neue Seite "Bargeldbestand"

## Zusammenfassung
Eine neue Navigationsoption **"Bargeldbestand"** wird zwischen "Verlauf" und "Mitarbeiter" eingefuegt. Diese Seite zeigt eine tabellarische Uebersicht aller Sessions mit allen relevanten Werten zur Bargeldberechnung - aehnlich wie im Excel-Screenshot.

## Funktionsweise

Die neue Seite zeigt eine scrollbare Tabelle mit allen Sessions. Jede Zeile repraesentiert einen Tag mit:
- Allen Einnahmen und Abzuegen, die in die BARGELD-Berechnung einfliessen
- Der berechneten BARGELD-Summe am Ende
- Farbcodierung: positive Werte gruen, negative Werte rot

**Spalten der Tabelle:**
| Datum | Tagesumsatz | Kreditkarten | OrderSmart | Wolt | Gutscheine EL | FineDine | Gutschein VK | Einladung | Offene RE | Vorschuss | Ausgaben | **Bargeld** |

## Geplante Aenderungen

### 1. Navigation erweitern (AppLayout.tsx)
- Neuen Navigationseintrag "Bargeldbestand" mit Icon `Wallet` hinzufuegen
- Position: nach "Verlauf", vor "Mitarbeiter"

### 2. Neue Seite erstellen (CashBalance.tsx)
- Neuer Hook `useCashBalanceData` der alle Sessions mit zugehoerigen waiter_shifts und expenses laedt
- Tabelle mit horizontalem Scroll fuer alle Spalten
- Datum formatiert wie "Mo 5.Jan"
- Summenzeile am Ende (optional)
- Responsive Design mit horizontalem Scroll auf Mobile

### 3. Route registrieren (App.tsx)
- Neue Route `/cash-balance` fuer die CashBalance-Seite

---

## Technische Details

### Neuer Hook: useCashBalanceData
```typescript
// Laedt alle Sessions mit aggregierten Daten
export function useCashBalanceData() {
  return useQuery({
    queryKey: ['cash-balance'],
    queryFn: async () => {
      // 1. Alle Sessions laden
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: true });
      
      // 2. Alle waiter_shifts laden
      const { data: waiterShifts } = await supabase
        .from('waiter_shifts')
        .select('*');
      
      // 3. Alle expenses laden  
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*');
      
      // 4. Pro Session aggregieren und BARGELD berechnen
      return sessions.map(session => {
        const shifts = waiterShifts.filter(s => s.session_id === session.id);
        const sessionExpenses = expenses.filter(e => e.session_id === session.id);
        
        // Berechnungen analog zu useStatistics.ts
        const kellnerUmsatz = shifts.reduce((sum, w) => sum + (w.pos_sales || 0), 0);
        const totalHilfMahl = shifts.reduce((sum, w) => sum + (w.hilf_mahl || 0), 0);
        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        const bargeld = kellnerUmsatz + (session.vouchers_sold || 0) + ...;
        
        return {
          date: session.session_date,
          kellnerUmsatz,
          kreditkarten: (session.terminal_1_total || 0) + (session.terminal_2_total || 0),
          ordersmart: session.ordersmart_revenue || 0,
          wolt: session.wolt_revenue || 0,
          gutscheineEL: session.vouchers_redeemed || 0,
          finedine: session.finedine_vouchers || 0,
          gutscheineVK: session.vouchers_sold || 0,
          einladung: session.einladung || 0,
          offeneRE: totalOpenInvoices,
          vorschuss: session.vorschuss || 0,
          ausgaben: totalExpenses,
          bargeld,
        };
      });
    },
  });
}
```

### UI-Komponente: CashBalance.tsx
- Verwendet `AppLayout` wie alle anderen Seiten
- Titel "Bargeldbestand" mit Icon `Wallet`
- Card mit scrollbarer Tabelle
- Spalten mit `text-right tabular-nums` fuer Zahlen
- BARGELD-Spalte mit bedingter Farbgebung (gruen/rot)
- Optional: Filter nach Monat/Zeitraum

