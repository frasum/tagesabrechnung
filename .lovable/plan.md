
## BARGELD-Berechnung (Korrigiert)

### Formel

```text
BARGELD = pos_total (Vectron-Gesamtumsatz)
        + vouchers_sold (Gutscheine verkauft)
        + sonstige_einnahme (Sonstige Bar-Einnahmen außerhalb POS)
        − terminal_1_total (EC-Karten)
        − terminal_2_total (Visa/Amex)
        − ordersmart_revenue
        − wolt_revenue
        − vouchers_redeemed (Gutscheine eingelöst)
        − finedine_vouchers
        − einladung
        − totalOpenInvoices (Offene Rechnungen)
        − vorschuss
        − totalExpenses (Ausgaben)
```

### Wichtige Hinweise

| Feld | In Formel | Erklärung |
|------|-----------|-----------|
| `pos_total` | ✓ Basis | Vectron-Gesamtumsatz inkl. Takeaway GL |
| `vouchers_sold` | + addiert | Gutschein-Verkäufe erhöhen Bargeld |
| `sonstige_einnahme` | + addiert | Bar-Einnahmen außerhalb des POS-Systems |
| `takeaway_total` | ✗ nicht abziehen | Bereits in `pos_total` enthalten |
| `hilf_mahl` | ✗ nicht addieren | Bereits in `pos_total` enthalten |

### Betroffene Dateien (alle synchron)

- `src/hooks/useCashBalanceData.ts` — Monatliche Bargeld-Übersicht
- `src/pages/DailySummary.tsx` — Tagesabrechnung
- `src/pages/ManagerDashboard.tsx` — Dashboard Live-Vorschau
- `src/hooks/useStatistics.ts` — Statistik-Auswertungen

---

## Kassenbestand-Logik

### Tägliche Berechnung

```text
Kassenstand = 1.000 € (Wechselgeld/Anfangsbestand)
            + BARGELD (aktueller Tag)
            + Tresor-Transfers (vom Tresor zur Kasse)
```

### Regeln

1. **Kein Übertrag vom Vortag** — Überschüssiges Bargeld wird am Tagesende abgeführt
2. **Frischer Start** — Jeder Tag beginnt mit 1.000 € Wechselgeld
3. **Anzeige-Logik** — Kassenstand-Karte erscheint nur bei Defizit (< 1.000 €)
4. **Tresor-Transfers** — Nur Transfers des aktuellen Tages werden berücksichtigt
