

## Sticky Toolbar für Küchenplan

Die Toolbar mit den Skill-Buttons und dem Monatspicker wird **sticky** gemacht, sodass sie beim Scrollen oben am Bildschirm kleben bleibt.

### Umsetzung

In `src/pages/KuechePlan.tsx`:
- Den Toolbar-Bereich (Header + Skill-Buttons) in ein `div` mit `sticky top-0 z-20 bg-background pb-3` wrappen
- Damit bleibt die gesamte Toolbar (Titel, Monatspicker, Skill-Toggles) beim Scrollen sichtbar
- Ein subtiler `border-b` oder `shadow-sm` wird hinzugefügt, sobald der Bereich klebt, um die Trennung zum Inhalt zu verdeutlichen

Keine weiteren Dateien betroffen — rein CSS/Layout-Änderung in einer Datei.

