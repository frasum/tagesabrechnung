

# Lam (waiter_gl) in Provision einbeziehen bei Service-Schichten

## Problem

`GL_ROLES` auf Zeile 16 enthält `"waiter_gl"`. Dadurch wird Lam **pauschal** aus der gesamten Provisionsberechnung ausgeschlossen — auch an Tagen, an denen er als Kellner in `waiter_shifts` eingetragen ist.

## Analyse

Die Logik ist bereits korrekt aufgebaut: Lam taucht in `waiter_shifts` nur auf, wenn er tatsächlich Service-Schichten hat. Die `zt_shifts`-Abfrage filtert ebenfalls auf `department = "Service"`. Das heißt: Wenn `waiter_gl` nicht mehr pauschal ausgeschlossen wird, wird Lam automatisch nur an den Tagen berücksichtigt, an denen er tatsächlich Service arbeitet.

## Lösung

**Eine Zeile ändern** in `src/pages/zeiterfassung/ZtProvision.tsx`, Zeile 16:

```typescript
// Vorher:
const GL_ROLES = new Set(["gl", "waiter_gl", "kitchen_gl", "all"]);

// Nachher:
const GL_ROLES = new Set(["gl", "kitchen_gl"]);
```

`waiter_gl` und `all` werden entfernt, da beide Rollen Service-Anteil haben. An Tagen, an denen Lam als GL (ohne `waiter_shifts`-Eintrag) arbeitet, taucht er gar nicht in den Daten auf und wird somit automatisch nicht berücksichtigt.

