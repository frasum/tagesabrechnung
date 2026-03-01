

## Plan: "Am Pool beteiligt"-Checkbox entfernen

Der Pool-Status wird bereits in den Stammdaten des Mitarbeiters festgelegt (`participates_in_pool`). Die Checkbox auf der Abrechnungsseite ist daher redundant und soll entfernt werden.

### Änderung in `src/pages/WaiterCashUp.tsx`

1. **Checkbox + Label entfernen** (Zeilen 293–308): Die gesamte Checkbox-UI im CardHeader entfernen.

2. **State beibehalten**: `newParticipatesInPool` bleibt als interne Variable, wird aber ausschließlich automatisch gesetzt:
   - Beim Auswählen eines Mitarbeiters (Zeile 318–321, bereits vorhanden)
   - Beim Bearbeiten einer bestehenden Schicht (Zeile 97, bereits vorhanden)
   - Beim Zurücksetzen (Zeile 83, bereits vorhanden)

3. **Team-Mitglieder-Bereich**: Die bedingte Anzeige `{newParticipatesInPool && ...}` bleibt bestehen, damit bei Nicht-Pool-Mitarbeitern keine Team-Auswahl erscheint.

4. **Speicherlogik**: `participates_in_pool: newParticipatesInPool` wird weiterhin in die DB geschrieben (Zeilen 140, 159), da der Wert dort für die Trinkgeldberechnung gebraucht wird.

Einzige sichtbare Änderung: Die Checkbox verschwindet aus dem Formular-Header.

