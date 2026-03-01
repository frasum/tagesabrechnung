

## Anpassungen am Wochenplan

Zwei Änderungen basierend auf dem Buchhaltungs-Screenshot und dem Nutzerwunsch:

### 1. Leere Zeilen nicht mehr abdunkeln
Die `empty-row`-Klasse wird von den Mitarbeiterzeilen entfernt — alle Zeilen werden gleichwertig angezeigt, unabhängig davon ob Stunden eingetragen sind.

### 2. Farbgebung an Buchhaltung angleichen
Die Buchhaltung nutzt ein helles, cleanes Design mit weißem Hintergrund, dezenten Trennlinien und grünen/roten Akzenten für U/K. Der Wochenplan soll diese Ästhetik übernehmen:
- Header-Zeile: hellgrauer Hintergrund wie in Buchhaltung (`bg-muted`)
- Abteilungs-Header: gleicher Stil wie Buchhaltung (farbiger Border-Left, dezenter Hintergrund)
- Zebra-Striping: dezenter (`bg-muted/30` statt `/70`)
- Urlaub/Krank-Spalten im Summary: grüne/rote Akzentfarben wie in Buchhaltung
- Totals-Spalte: `bg-primary/5` wie in Buchhaltung für die Gesamt-Spalte

### Änderungen

| Datei | Änderung |
|---|---|
| `src/pages/zeiterfassung/ZtWochenplan.tsx` | `empty-row`-Klasse entfernen; U/K-Spalten mit grün/rot-Farbakzenten; Totals-Gesamt mit `bg-primary/5` |
| `src/index.css` | Zebra-Striping dezenter machen (`bg-muted/40`); `empty-row`-Styles können bleiben (werden nur nicht mehr verwendet) |

