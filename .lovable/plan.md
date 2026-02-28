

## Problem

Die Zeiterfassungs-Seite (`ZtLayout` / `ZtWochenplan`) wird **ohne `AppLayout`** gerendert. Alle anderen Seiten wrappen sich individuell in `<AppLayout>`, aber die Zeiterfassung tut das nicht — deshalb verschwindet die Sidebar/Navigation.

## Lösung

`ZtLayout.tsx` mit `<AppLayout>` wrappen, so wie es alle anderen Seiten machen.

### Änderung: `src/pages/zeiterfassung/ZtLayout.tsx`

- `AppLayout` importieren
- Den gesamten Return-Inhalt in `<AppLayout>...</AppLayout>` wrappen

```tsx
return (
  <AppLayout>
    <ZtProvider>
      <div className="space-y-4">
        {/* tabs + Outlet wie bisher */}
      </div>
    </ZtProvider>
  </AppLayout>
);
```

Eine einzige Datei, eine einzige Änderung.

