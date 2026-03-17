

## Paint-Modus für Dienstplan Küche & Service

Die DienstplanKueche und DienstplanService Seiten bekommen denselben Paint-Modus wie der KuechePlan — Skill-Buttons, Löschen, Urlaub und Krank als ToggleGroup.

### Ansatz

Statt den Code in drei Dateien zu duplizieren, erstelle ich eine **wiederverwendbare Toolbar-Komponente** `DienstplanPaintToolbar`, die den Paint-Modus kapselt.

### Änderungen

**1. Neue Datei: `src/components/dienstplan/DienstplanPaintToolbar.tsx`**
- Enthält die ToggleGroup mit Skill-Buttons (gefiltert nach `department`), Löschen, Urlaub, Krank
- Indicator-Bar mit aktivem Modus-Name und Farbe
- Hilfetext
- Props: `department`, gibt `activeSkillId`, `deleteMode`, `absencePaintType` nach oben via Callback oder per eigenem State + Render-Prop

**2. `src/pages/dienstplan/DienstplanKueche.tsx`**
- `DienstplanPaintToolbar` einbinden mit `department="kitchen"`
- State für `activeSkillId`, `deleteMode`, `absencePaintType`
- An `MonthlyGrid` weiterreichen

**3. `src/pages/dienstplan/DienstplanService.tsx`**
- Dasselbe mit `department="service"` — zeigt Service-Skills (SERVICE, BAR, GL, Hausmeister)

**4. `src/pages/KuechePlan.tsx`**
- Refactor: die duplizierte ToggleGroup durch `DienstplanPaintToolbar` ersetzen

### Komponenten-API

```typescript
interface DienstplanPaintToolbarProps {
  department: 'kitchen' | 'service';
  activeSkillId: string | null;
  deleteMode: boolean;
  absencePaintType: 'vacation' | 'sick' | null;
  onModeChange: (state: { activeSkillId: string | null; deleteMode: boolean; absencePaintType: 'vacation' | 'sick' | null }) => void;
}
```

4 Dateien: 1 neue Komponente, 3 bestehende Seiten anpassen.

