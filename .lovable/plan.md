

## Statistiken-Seite modernisieren

Gleicher Design-Stil wie bei StaffManagement und PermissionManagement anwenden.

### Änderungen in `src/pages/Statistics.tsx`

1. **Hero Header mit Gradient-Banner**: Ersetze den einfachen Header durch das `rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5`-Pattern mit Icon in abgerundetem Container. Restaurant-Tabs und Zeitraum-Tabs darunter in den Banner integriert.

2. **Zusammenfassung Zeitraum modernisieren**: Die vier `bg-muted`-Boxen durch subtilere Cards ersetzen — `border border-border/50 bg-card` mit leichtem linkem Farbbalken (analog zu den StatCards oben).

3. **Empty State modernisieren**: Icon in abgerundetem Container wie bei StaffManagement, `border-dashed` beibehalten.

4. **Loading State**: Konsistenter animierter Pulse-Text im gleichen Layout.

### Änderungen in `src/components/statistics/PeriodComparison.tsx`

5. **Card-Header modernisieren**: Icon in `rounded-xl bg-primary/15`-Container statt direkt neben dem Text.

### Kein funktionaler Eingriff — nur visuelle Angleichung an das bestehende Design-System.

