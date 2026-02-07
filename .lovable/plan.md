
# Plan: Trinkgeld-Prozent pro Kellner anzeigen

## Übersicht

Zwei neue Spalten in der Kellner-Übersichtstabelle:
1. **TG %** - Trinkgeld-Prozentsatz der aktuellen Schicht (Pool-Anteil / Umsatz * 100)
2. **Ø TG %** - Historischer Durchschnitt über alle bisherigen Schichten des Kellners

## Berechnung

### TG % (Aktuell)
```text
TG % = (Pool-Anteil / Umsatz) × 100
     = (tipPerWaiter / shift.pos_sales) × 100
```

### Ø TG % (Historisch)
Für jeden Kellner müssen wir alle vergangenen Schichten laden und berechnen:
```text
Ø TG % = Summe aller Pool-Anteile / Summe aller Umsätze × 100
```

## Technische Umsetzung

### 1. Neuer Hook für historische Durchschnitte

**Datei:** `src/hooks/useSession.ts`

Neuer Hook `useWaiterTipAverages` der alle historischen Schichten lädt und pro Kellner den Durchschnittsprozentsatz berechnet:

```typescript
export function useWaiterTipAverages() {
  return useQuery({
    queryKey: ['waiter-tip-averages'],
    queryFn: async () => {
      // 1. Alle Sessions mit ihren Shifts laden
      // 2. Pro Session den Pool berechnen und gleichmäßig verteilen
      // 3. Pro Kellner: Summe(Pool-Anteile) / Summe(Umsätze) * 100
      // 4. Map zurückgeben: { "Name": avgTipPercent }
    },
  });
}
```

### 2. Berechnung der Durchschnitte

Die Logik folgt dem bestehenden Pool-System aus `useStatistics.ts`:

```typescript
// Für jede Session:
const sessionPool = sessionShifts.reduce((sum, shift) => {
  const expected = kassiert + hilfMahl - openInvoices - cardTotal;
  const contribution = cashHandedIn - expected - kitchenTip;
  return sum + contribution;
}, 0);

const sharePerWaiter = sessionPool / sessionShifts.length;

// Aggregieren pro Kellner:
waiterAverages[name] = {
  totalPoolShare: ...,  // Summe aller Pool-Anteile
  totalSales: ...,      // Summe aller Umsätze
  shiftsCount: ...      // Anzahl Schichten
};

// Durchschnitt berechnen:
avgTipPercent = totalSales > 0 ? (totalPoolShare / totalSales) * 100 : 0;
```

### 3. UI-Anpassungen in WaiterCashUp.tsx

**Neue Spalten in der Tabelle:**

| Name | ... | Beitrag | Anteil | TG % | Ø TG % | 🗑️ |
|------|-----|---------|--------|------|--------|-----|
| Max  | ... | +50€    | 75€    | 5.2% | 4.8%   | 🗑️ |

**Code-Änderungen:**
1. Hook importieren und aufrufen
2. Zwei neue `<TableHead>` Spalten hinzufügen
3. Pro Zeile TG % berechnen und anzeigen
4. Ø TG % aus dem Hook-Ergebnis auslesen

### 4. Visuelle Darstellung

```text
TG %:
- Berechnung: tipPerWaiter / shift.pos_sales * 100
- Anzeige: "5.2 %" in neutraler Farbe

Ø TG %:
- Aus Hook-Daten
- Grün wenn über aktuellem %, sonst neutral
- Bei zu wenig Daten: "-" anzeigen
```

---

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/useSession.ts` | Neuer `useWaiterTipAverages` Hook |
| `src/pages/WaiterCashUp.tsx` | 2 neue Spalten: TG %, Ø TG % |

## Ergebnis

- Jeder Kellner sieht seinen aktuellen Trinkgeld-Prozentsatz
- Der historische Durchschnitt zeigt die langfristige Performance
- Der Durchschnitt wird mit der Zeit aussagekräftiger (mehr Daten)
