

## Plan: Skill-Badges aus Dienstplan-Grid entfernen

In `src/components/dienstplan/MonthlyGrid.tsx` die Skill-Badge-Anzeige neben dem Mitarbeiternamen entfernen:

1. **Imports entfernen**: `SkillBadge`, `useEmployeeSkills` Imports löschen
2. **Hook-Aufruf entfernen**: `useEmployeeSkills()` Call entfernen
3. **Render-Code vereinfachen**: Im `filteredEmployees.map` Block die `empSkillIds`/`empSkills` Berechnung und die `SkillBadge`-Komponenten aus der Mitarbeiter-Namensspalte entfernen
4. **employeeSkillIds Prop**: Die `employeeSkillIds` Prop wird noch an `ShiftCell` → `ShiftEditPopover` weitergereicht (für Posten-Zuweisung). Diese muss erhalten bleiben, also den `allEmployeeSkills` Hook und die `empSkillIds` Berechnung beibehalten, nur die Badge-Anzeige entfernen.

Korrektur: Nur die `SkillBadge` Import und die Badge-Render-Zeilen entfernen. Die restliche Logik bleibt.

