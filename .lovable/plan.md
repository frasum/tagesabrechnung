

## Farbiger Indikator-Balken unter der Toolbar

Ein schmaler, animierter Balken direkt unter der sticky Toolbar, der die Farbe des aktiven Skills (oder Rot im Löschmodus) anzeigt.

### Änderung in `src/pages/KuechePlan.tsx`

Nach dem schließenden `</div>` der Toolbar (Zeile ~126), aber noch innerhalb des sticky Containers, einen Balken einfügen:

```tsx
{/* Active mode indicator bar */}
{(activeSkillId || deleteMode) && (
  <div
    className="h-1 rounded-full mt-2 transition-all duration-300"
    style={{
      backgroundColor: deleteMode
        ? 'hsl(var(--destructive))'
        : kitchenSkills.find(s => s.id === activeSkillId)?.color,
    }}
  />
)}
```

- **Aktiver Skill**: Balken in der Skill-Farbe
- **Löschmodus**: Balken in Destructive-Rot
- **Kein Modus aktiv**: Balken verschwindet
- Smooth `transition-all` Animation beim Wechsel

Eine Datei, eine kleine Ergänzung (~8 Zeilen).

