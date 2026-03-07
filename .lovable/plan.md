

## Problem

Die Kreditkarten-Werte (3.000–6.000 €) liegen sehr nah am Tagesumsatz (4.000–6.500 €), da der Großteil der Umsätze unbar bezahlt wird. Die orange Kreditkarten-Linie wird daher von der blauen Tagesumsatz-Fläche visuell verdeckt.

## Lösung

Die Kreditkarten-Linie visuell hervorheben, damit sie trotz ähnlicher Werte sichtbar ist:

### `src/pages/Statistics.tsx`

1. **Kreditkarten-Area mit gestrichelter Linie darstellen** — `strokeDasharray="5 3"` hinzufügen, damit die Linie sich vom Tagesumsatz abhebt
2. **Rendering-Reihenfolge anpassen** — Kreditkarten NACH dem Tagesumsatz rendern (ist bereits so), aber die `fillOpacity` der Kreditkarten-Fläche deutlich reduzieren (auf 0.1), damit die orange Linie klar erkennbar bleibt
3. **Stärkere Strichbreite** für Kreditkarten (`strokeWidth={2.5}`) für bessere Sichtbarkeit

