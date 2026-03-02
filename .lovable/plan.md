

## GlobalLayout Sidebar an AppLayout-Stil anpassen

Die `GlobalLayout.tsx` Sidebar (verwendet auf /staff, /permissions) bekommt dieselben visuellen Modernisierungen wie die `AppLayout.tsx`:

### Änderungen in `src/components/layout/GlobalLayout.tsx`

- **Glassmorphism Header**: `backdrop-blur-sm bg-sidebar/80` für Desktop- und Mobile-Header
- **Aktiver Eintrag**: `border-l-3 border-primary` + `bg-sidebar-accent/50` statt `bg-sidebar-primary` (voller Hintergrund)
- **Icon-Highlight**: Aktives Icon bekommt `text-primary`
- **Gruppenlabels**: "Zurück zur App" als eigener Bereich oben, dann Separator, dann Gruppenlabel "VERWALTUNG" über Mitarbeiter/Berechtigungen
- **Separator**: `h-px bg-sidebar-border my-3` zwischen Bereichen
- **Mobile-Menü**: Gleiche Styles übernehmen

