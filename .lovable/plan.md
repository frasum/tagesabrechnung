
## Validierungsmeldung für fehlende Gästeanzahl beim PDF-Export

### Aktueller Zustand
Der PDF-Export-Button zeigt derzeit `disabled={formData.guest_count === 0}`, was bedeutet:
- Der Button ist grau/deaktiviert, wenn keine Gästeanzahl eingetragen ist
- Nutzer können den Button nicht klicken
- Es gibt keine visuelle Rückmeldung, **warum** der Button deaktiviert ist

### Gewünschter Zustand
- Der Button bleibt **klickbar** (nicht mehr `disabled`)
- Wenn die Gästeanzahl 0 ist, zeigt ein Toast-Hinweis: "Gästeanzahl fehlt" (mit `variant="destructive"`)
- Der PDF-Export wird nicht durchgeführt
- Wenn die Gästeanzahl `> 0` ist, läuft der PDF-Export normal ab

### Technische Umsetzung

**Datei:** `src/pages/DailySummary.tsx`

**Änderungen am PDF-Export-Button (Zeile 1081):**

1. **Attribut `disabled={...}` entfernen** – Der Button wird nicht mehr deaktiviert
2. **`onClick` Handler anpassen:**
   ```typescript
   onClick={() => {
     if (formData.guest_count === 0) {
       toast({ 
         title: "Gästeanzahl fehlt", 
         variant: "destructive" 
       });
       return;
     }
     handleExportPDF();
   }}
   ```

**Was bleibt gleich:**
- Der `handleExportPDF`-Hook ist bereits vorhanden (Zeile 318)
- Der `toast`-Hook ist bereits importiert (Zeile 21)
- Die Gesamtlogik ändert sich nicht – nur die Validierung wird zur Laufzeit geprüft statt vorher

### Benutzerfluss nach der Änderung

1. **Nutzer drückt PDF-Export ohne Gästeanzahl:**
   - Toast erscheint: "Gästeanzahl fehlt" (rot)
   - Kein Export
   - Nutzer weiß sofort, was zu tun ist

2. **Nutzer trägt Gästeanzahl ein (z.B. 5) und drückt PDF-Export:**
   - Toast verschwindet
   - PDF-Export lädt/wird generiert
   - Alles funktioniert wie gewohnt

### Risiken / Nebeneffekte
- Keine – die Validierungslogik bleibt identisch, nur die **Präsentation** ändert sich
- Button-Styling bleibt unverändert
- Mobile Nutzbarkeit unverändert
