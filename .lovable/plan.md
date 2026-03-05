

## Analyse: SFN-Modus-Umschaltung im Lohnbüro

### Befund

Der Code in `PayrollPortal.tsx` enthält bereits die korrekte bedingte Darstellung:
- Toggle-Buttons (Zeilen 442-447) sind vorhanden
- `isExtended` steuert die Spaltenanzahl in Header, Rows und Footer
- `sfnMode` wird korrekt als Prop durchgereicht

**Mögliche Ursache**: Die `table-fixed` CSS-Klasse auf der Tabelle (Zeile 1034) kann dazu führen, dass der Browser das Tabellen-Layout bei dynamischer Spaltenänderung nicht korrekt neu berechnet. Zusätzlich könnte React die Tabelle nicht vollständig neu rendern, da sich der Komponentenbaum strukturell ähnlich bleibt.

### Lösung

1. **`key`-Prop auf der Tabelle basierend auf `sfnMode`** hinzufügen, um bei Moduswechsel einen vollständigen Re-Mount der Tabelle zu erzwingen – sowohl in `PayrollBuchhaltungTab` als auch in `PayrollZusammenfassungTab`.

2. **Gleiche Änderung in der Zusammenfassung-Tabelle** (Zeile ~905), damit auch dort die Spalten korrekt aktualisiert werden.

### Betroffene Datei

`src/pages/shared/PayrollPortal.tsx`:
- Zeile ~1034: `<table className="..." key={sfnMode}>` in PayrollBuchhaltungTab
- Zeile ~905 (Zusammenfassung-Tabelle): `<table className="..." key={sfnMode}>`

