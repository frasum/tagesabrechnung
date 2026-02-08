
# Plan: Druckfunktion mit Canvas-basiertem Ansatz

## Problem
Die aktuelle iframe-basierte Druckmethode zeigt ein leeres Blatt, weil:
1. Das PDF im versteckten iframe nicht vollständig geladen wird bevor `print()` aufgerufen wird
2. Blob-URLs in iframes haben Cross-Origin-Einschränkungen beim Drucken
3. Der Browser-PDF-Viewer im iframe wird nicht richtig initialisiert

## Lösung: Canvas-zu-Bild Druckansatz

Da wir das PDF bereits mit pdf.js auf Canvas-Elemente rendern, können wir diese Canvas-Bilder direkt zum Drucken verwenden. Diese Methode ist zuverlässiger und umgeht alle Browser-Einschränkungen.

### Ablauf

```text
+-------------------+     +------------------+     +-------------------+
| Canvas-Seiten     | --> | Neues Fenster    | --> | Browser Print     |
| (bereits gerendert)|     | mit <img> Tags   |     | Dialog            |
+-------------------+     +------------------+     +-------------------+
```

## Änderungen

### Datei: src/components/shared/PdfPreview.tsx

1. **Refs für alle Canvas-Elemente sammeln**
   - Ein Array von Canvas-Refs erstellen um auf alle gerenderten Seiten zugreifen zu können

2. **Neue handlePrint Funktion**
   - Alle Canvas-Elemente zu Data-URLs konvertieren
   - Ein neues Fenster mit HTML-Inhalt erstellen
   - Jede Seite als `<img>` Tag mit Print-optimiertem CSS einbetten
   - Nach dem Laden `print()` aufrufen

### Technische Umsetzung

```typescript
// Canvas-Refs sammeln
const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

// Druckfunktion
const handlePrint = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // HTML mit allen Seiten als Bilder erstellen
  const images = Array.from(canvasRefs.current.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, canvas]) => canvas.toDataURL('image/png'));

  printWindow.document.write(`
    <html>
      <head>
        <title>${fileName || 'PDF Druck'}</title>
        <style>
          @media print {
            body { margin: 0; }
            img { 
              width: 100%; 
              page-break-after: always; 
            }
            img:last-child { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        ${images.map(src => `<img src="${src}" />`).join('')}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
};
```

3. **PdfPage Komponente anpassen**
   - Canvas-Ref an übergeordnete Komponente melden via Callback

## Vorteile dieser Lösung

- Kein Popup-Blocker Problem (synchroner window.open Aufruf)
- Keine Blob-URL/iframe Probleme
- Die Seiten werden garantiert korrekt angezeigt, da sie bereits gerendert sind
- Funktioniert in allen Browsern konsistent
- Print-CSS sorgt für korrekte Seitenumbrüche

## Alternative: jsPDF autoPrint

Falls der Canvas-Ansatz nicht gewünscht ist, könnte man auch jsPDF's eingebaute `autoPrint()` Methode nutzen:

```typescript
// In pdfExport.ts
doc.autoPrint();
const blobUrl = URL.createObjectURL(doc.output('blob'));
// Dann iframe öffnen - PDF startet automatisch Druckdialog
```

Dies ist jedoch weniger zuverlässig als der Canvas-Ansatz.
