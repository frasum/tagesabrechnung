

## Fix: Wochenplan PDF/Excel Export funktioniert nicht

### Analyse

Die Export-Buttons rufen `exportWochenplanPdf()` und `exportWochenplanExcel()` auf. Beide Funktionen sind `async` (Excel wegen `await import("xlsx")`, PDF wegen jsPDF-Blob-Download), aber die `onClick`-Handler verwenden kein `async/await` und kein Error-Handling. Wenn ein Fehler auftritt (z.B. beim dynamischen Import oder Download), wird er stillschweigend verschluckt — der User sieht nichts.

Zusätzlich fehlt ein visuelles Feedback (Loading-State), dass der Export läuft.

### Änderungen

**1. `src/pages/zeiterfassung/ZtWochenplan.tsx`**

Die `onClick`-Handler in `async` Wrapper mit `try/catch` und Toast-Feedback umwandeln:

```typescript
onClick={async () => {
  const period = periods?.find(p => p.id === selectedPeriodId);
  if (!period || !employees || !effectiveWeeks || !allPeriodShifts) return;
  try {
    await exportWochenplanPdf(period.label, employees, effectiveWeeks, allPeriodShifts, holidays ?? new Map(), sfnMode, holidayRatesMap);
    toast.success("PDF exportiert");
  } catch (err) {
    console.error("PDF export failed:", err);
    toast.error("PDF-Export fehlgeschlagen");
  }
}}
```

Gleiches Pattern für den Excel-Button.

Optional: Ein `isExporting`-State für einen Loading-Indicator auf den Buttons.

1 Datei, minimale Änderung — die Handler werden in async-Funktionen mit Error-Handling gewrappt.

