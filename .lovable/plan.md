
## Ziel
Die Pfeile (Up/Down-Stepper) im Feld **„Gästeanzahl“** vollständig entfernen – in allen Browsern.

## Warum die Pfeile noch da sind
Das Feld ist aktuell `type="number"`. Manche Browser (insb. Safari/Firefox, teils auch macOS) zeigen die Stepper-Pfeile trotz einzelner CSS-Regeln weiterhin oder nur teilweise ausgeblendet.

## Lösung (robust, browserübergreifend)
Wir machen das „Gästeanzahl“-Feld zu einem **Textfeld mit numerischer Tastatur**, statt `type="number"`.
- `type="text"`
- `inputMode="numeric"` + `pattern="[0-9]*"` → auf Mobilgeräten kommt weiterhin die Zifferntastatur
- Eingabe wird beim Tippen auf **nur Ziffern** gefiltert
- Gespeichert wird weiterhin eine Zahl (Integer) wie bisher

Damit gibt es keine Stepper-Pfeile mehr, weil die Browser diese nur bei `type="number"` anzeigen.

## Konkrete Änderungen

### 1) `src/components/daily-summary/layouts/ExcelLayout.tsx`
Im „Gästeanzahl“-Row:
- `Input` ändern von:
  - `type="number"` → `type="text"`
  - `min={0}` entfernen (gilt nur für number)
- Value-Control:
  - `value={guestCount > 0 ? String(guestCount) : ''}`
- `onChange` anpassen:
  - Ziffern filtern: `const cleaned = e.target.value.replace(/\D/g, '')`
  - `onGuestCountChange?.(cleaned ? parseInt(cleaned, 10) : 0)`
- Klassen:
  - Spinner-spezifische Klassen können raus (werden nicht mehr benötigt)
  - restliche Styles bleiben gleich (Höhe, Breite, right-align, etc.)

### 2) Testfälle (kurz)
- Gästeanzahl eintippen (z.B. 142) → keine Pfeile sichtbar
- Feld leeren → wird als 0 gespeichert, Platzhalter „0“ sichtbar
- Durchschnitt (⌀) erscheint weiterhin erst ab Gästeanzahl > 0
- PDF-Export Button bleibt wie gewünscht erst aktiv, wenn Gästeanzahl > 0

## Risiko / Nebenwirkungen
- Vorteil: Pfeile garantiert weg.
- Verhalten bleibt identisch: es werden nur ganze Zahlen akzeptiert (keine Kommas/Punkte).
- Mobile Usability bleibt gut durch `inputMode="numeric"`.

## Umsetzungsschritte (in Reihenfolge)
1. ExcelLayout „Gästeanzahl“-Input von number → text umstellen (inkl. Filter/Parsing).
2. Kurz in der Vorschau prüfen (Desktop + ggf. mobile View), ob Pfeile weg sind und Berechnung/Export unverändert funktionieren.
