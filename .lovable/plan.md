

## Plan: Button-Text und Farbe ändern

**Datei:** `src/pages/DailySummary.tsx` (Zeile ~1188)

Änderung:
- Text von "Herunterladen" → "Abrechnung abschließen"
- Button-Variante auf `destructive` setzen (Signal-Rot)

```tsx
// Vorher:
<Button onClick={handleDownloadPdf}>
  <Download className="w-4 h-4 mr-2" />
  Herunterladen
</Button>

// Nachher:
<Button variant="destructive" onClick={handleDownloadPdf}>
  <Download className="w-4 h-4 mr-2" />
  Abrechnung abschließen
</Button>
```

