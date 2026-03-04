

## Plan: Sozialabgabenbefreiung im Brutto-Netto-Rechner

### Änderungen

**1. `src/pages/zeiterfassung/ZtBruttoNetto.tsx`**
- `is_sv_exempt` zur Staff-Query hinzufügen (Zeile 64)
- Neuen State `isSvExempt` hinzufügen, default `false`
- Im Auto-fill `useEffect` den Wert aus `staffDetails.is_sv_exempt` übernehmen
- Switch-Toggle "Sozialabgabenbefreit" in der UI ergänzen (unter Kirchensteuer-Toggle)
- `isSvExempt` im Payload an `calculate-payroll` übergeben

**2. `supabase/functions/calculate-payroll/index.ts`**
- Wenn `body.isSvExempt === true`: Sozialversicherungsbeiträge (AN + AG: KV, RV, AV, PV) auf 0 setzen
- Gilt sowohl für API-Ergebnis als auch Fallback-Berechnung

### Ergebnis
- Feld wird aus Mitarbeiterkartei automatisch übernommen
- Kann im Rechner manuell überschrieben werden
- Berechnung berücksichtigt Befreiung korrekt (keine SV-Abzüge)

