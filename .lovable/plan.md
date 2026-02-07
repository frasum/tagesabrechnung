
## Plan: Enter-Taste springt global zum nächsten Eingabefeld

### Problem
Aktuell wird bei Enter nur `blur()` aufgerufen - der Cursor bleibt stehen und springt nicht zum nächsten Feld.

### Lösung
Die Navigation zum nächsten Feld wird direkt in die Basis-Komponente `Input` eingebaut, sodass es automatisch überall in der App funktioniert.

### Technische Umsetzung

**Datei 1: `src/components/ui/input.tsx`**

Die Komponente wird erweitert um einen `onKeyDown` Handler:

```typescript
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        // Alle fokussierbaren Eingabefelder finden
        const inputs = Array.from(
          document.querySelectorAll(
            'input:not([disabled]):not([readonly]):not([type="hidden"]), textarea:not([disabled]):not([readonly])'
          )
        ) as HTMLElement[];
        
        const currentIndex = inputs.indexOf(e.currentTarget);
        const nextInput = inputs[currentIndex + 1];
        
        // Aktuelles Feld verlassen (löst onBlur für Formatierung aus)
        e.currentTarget.blur();
        
        // Nächstes Feld fokussieren
        if (nextInput) {
          nextInput.focus();
        }
      }
      
      // Originales onKeyDown weitergeben
      onKeyDown?.(e);
    };

    return (
      <input
        type={type}
        onKeyDown={handleKeyDown}
        className={...}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Datei 2: `src/components/shared/CurrencyInput.tsx`**

Der eigene `handleKeyDown` Handler wird entfernt, da die Basis-Komponente das jetzt übernimmt.

### Verhalten nach der Änderung

| Aktion | Ergebnis |
|--------|----------|
| Enter drücken | Wert wird gespeichert, Cursor springt zum nächsten Feld |
| Tab drücken | Standard-Browser-Verhalten |
| Woanders klicken | Wert wird gespeichert (wie bisher) |

### Dateien die geändert werden
- `src/components/ui/input.tsx` - Enter-Navigation hinzufügen
- `src/components/shared/CurrencyInput.tsx` - Eigenes handleKeyDown entfernen
