

## Schichtzeiten-Card als aufklappbares Dropdown

### Änderung

**`src/components/zeiterfassung/ShiftTimeOverride.tsx`**

Die gesamte Card wird in ein Collapsible/Accordion umgewandelt:
- Der CardHeader wird zum klickbaren Toggle (mit Chevron-Icon)
- Standardmäßig eingeklappt — nur die Überschrift "Schichtzeiten anpassen (Admin)" ist sichtbar
- Bei Klick klappt der gesamte CardContent auf

### Umsetzung
- `useState<boolean>(false)` für `isOpen`
- `Collapsible` aus `@/components/ui/collapsible` verwenden
- CardHeader bekommt `onClick` + `cursor-pointer` + `ChevronDown`/`ChevronUp` Icon
- CardContent wird in `CollapsibleContent` gewrappt

1 Datei, rein visuell.

