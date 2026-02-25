

# Legende der Lieferplattformen erweitern

## Änderungen in `src/pages/Statistics.tsx`

### 1. Prozentangaben in Klammern hinzufügen
Jede Plattform in der Legende bekommt den Prozentanteil in Klammern neben dem Betrag.

### 2. Gesamt-Takeaway-Summe anzeigen
Unter der Legende eine Zeile mit dem Gesamtumsatz aller Lieferplattformen.

### Datei: `src/pages/Statistics.tsx`, Zeilen 399-415

Berechnung der Gesamtsumme und Prozentanteile:

```tsx
{/* Legend */}
{deliveryBreakdown.length > 0 && (
  <div className="space-y-3 mt-4">
    <div className="flex flex-wrap justify-center gap-4">
      {deliveryBreakdown.map((entry, index) => {
        const total = deliveryBreakdown.reduce((sum, d) => sum + d.value, 0);
        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(entry.value)} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
    <div className="text-center border-t pt-2">
      <span className="text-sm text-muted-foreground">Gesamt Takeaway: </span>
      <span className="text-sm font-bold tabular-nums">
        {formatCurrency(deliveryBreakdown.reduce((sum, d) => sum + d.value, 0))}
      </span>
    </div>
  </div>
)}
```

Keine weiteren Dateien betroffen.

