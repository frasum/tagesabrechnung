

## Problem

Das Label "Spitzname" im Mitarbeiter-Dialog (`StaffDialog.tsx` / `StaffDialogNative.tsx`) speichert den Wert in die DB-Spalte `name`, nicht in `nickname`. Die Zeiterfassung (BuchhaltungRow, ZtZusammenfassung, ZtWochenplan) nutzt aber `nickname` für die Anzeige `Vorname (SPITZNAME) Nachname`. Da `nickname` leer ist, wird der Spitzname nicht angezeigt.

## Lösung

Beim Speichern eines Mitarbeiters den `name`-Wert auch als `nickname` setzen, sofern `nickname` nicht separat angegeben ist. Zusätzlich das `name`-Feld in der Zeiterfassung-Namenslogik als Fallback-Nickname berücksichtigen.

### Änderungen

**1. `BuchhaltungRow.tsx` — Namenslogik erweitern (Zeile 40-43)**

Falls `nickname` leer ist, aber `name` sich von Vor-/Nachname unterscheidet, `name` als Spitzname verwenden:

```tsx
const effectiveNickname = emp.nickname || 
  (emp.name && emp.name !== emp.first_name && emp.name !== emp.last_name 
    ? emp.name : null);
const nicknameAlreadyInName = effectiveNickname && 
  (emp.first_name?.includes(effectiveNickname) || emp.last_name?.includes(effectiveNickname));
const nameBase = emp.first_name || emp.last_name
  ? [emp.first_name, effectiveNickname && !nicknameAlreadyInName ? `(${effectiveNickname})` : null, emp.last_name].filter(Boolean).join(" ")
  : emp.name;
```

**2. `ZtZusammenfassung.tsx` — gleiche Namenslogik anpassen (Zeile 268-271)**

Identische Änderung wie oben.

**3. `ZtWochenplan.tsx` — Zeile 705 anpassen**

```tsx
{emp.nickname || (emp.name !== emp.first_name && emp.name !== emp.last_name ? emp.name : null) || emp.first_name || emp.name}
```

Dies stellt sicher, dass der im Dialog eingegebene "Spitzname" (`name`-Feld) systemweit in der Zeiterfassung angezeigt wird, ohne die Datenbankstruktur zu ändern.

