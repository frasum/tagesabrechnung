

# Labels und Ausblenden in der PWA (WaiterMobile)

## Was wird gemacht
Die mobile Kellner-Ansicht bekommt die gleiche dynamische Label- und Ausblend-Logik wie die Desktop-Version. Aenderungen in der Label-Verwaltung (Umbenennen, Ein-/Ausblenden) wirken sich dann automatisch auch auf die PWA aus.

## Aenderungen in `src/pages/WaiterMobile.tsx`

### 1. useLabels-Hook einbinden
- `useLabels` mit der aktuellen `restaurantId` importieren
- `getLabel` und `isFieldHidden` verwenden

### 2. Labels dynamisch machen

| Aktuell hartcodiert | Wird zu |
|---|---|
| "Umsatz (POS Sales)" | `getLabel('pos_sales')` |
| "Abzugebender Betrag (Kassiert Brutto)" | `getLabel('kassiert_brutto')` |
| "Kartenzahlung" | `getLabel('card_total_gl')` |
| "Hilf Mahl" | `getLabel('hilf_mahl')` |
| "Offene Rechnung" | `getLabel('open_invoices')` |
| "Bargeld abgegeben" | `getLabel('cash_handed_in')` |

### 3. Felder bedingt ausblenden
Folgende Eingabefelder werden nur angezeigt, wenn sie nicht ausgeblendet sind:
- `card_total_gl` (steuert das Kartenzahlung-Feld)
- `hilf_mahl`
- `open_invoices`

Wenn ein Feld ausgeblendet ist, wird das Eingabefeld nicht gerendert und der Wert bleibt 0. Die Berechnungen (Erwartet, Kuechentipp, Trinkgeld) funktionieren weiterhin korrekt.

## Technische Details

### Betroffene Datei

| Datei | Aenderung |
|---|---|
| `src/pages/WaiterMobile.tsx` | `useLabels` importieren, hartcodierte Labels durch `getLabel()` ersetzen, Eingabefelder mit `isFieldHidden()` bedingt rendern |

### Beispiel der Aenderung
```typescript
// Vorher:
<Label>Kartenzahlung</Label>
<CurrencyInput value={formData.card_total} ... />

// Nachher:
{!isFieldHidden('card_total_gl') && (
  <div>
    <Label>{getLabel('card_total_gl')}</Label>
    <CurrencyInput value={formData.card_total} ... />
  </div>
)}
```

