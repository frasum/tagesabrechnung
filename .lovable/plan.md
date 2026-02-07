
# Tageswechsel auf 3:00 Uhr nachts verschieben

## Problem
Aktuell wechselt die Tagesabrechnung um Mitternacht (00:00 Uhr) auf den nächsten Tag. Das führt dazu, dass Abrechnungen nach Mitternacht dem falschen Tag zugeordnet werden.

## Lösung
Eine zentrale Hilfsfunktion erstellen, die das "Geschäftsdatum" berechnet. Der Geschäftstag endet erst um 3:00 Uhr nachts - alles zwischen 00:00 und 02:59 Uhr wird noch dem Vortag zugeordnet.

### Beispiel
- 07.02.2026 um 23:30 → Geschäftsdatum: 07.02.2026
- 08.02.2026 um 00:30 → Geschäftsdatum: 07.02.2026 (noch Vortag!)
- 08.02.2026 um 02:59 → Geschäftsdatum: 07.02.2026 (noch Vortag!)
- 08.02.2026 um 03:00 → Geschäftsdatum: 08.02.2026 (neuer Tag beginnt)

## Änderungen

### 1. Neue Hilfsfunktion erstellen
Neue Datei `src/utils/businessDate.ts` mit einer Funktion `getBusinessDate()`:
- Prüft ob die aktuelle Uhrzeit vor 3:00 Uhr liegt
- Falls ja: gibt den Vortag zurück
- Falls nein: gibt das aktuelle Datum zurück

### 2. Betroffene Seiten aktualisieren

**WaiterMobile.tsx** (Kellner-App)
- `const today = new Date()` ersetzen durch `const today = getBusinessDate()`

**ManagerDashboard.tsx**
- Initial-State für `selectedDate` von `new Date()` auf `getBusinessDate()` ändern

**WaiterCashUp.tsx**
- Initial-State für `selectedDate` von `new Date()` auf `getBusinessDate()` ändern

**DateSelector.tsx**
- "Heute" Button verwendet `getBusinessDate()` statt `new Date()`
- "Ist Heute" Prüfung verwendet ebenfalls `getBusinessDate()`

---

## Technische Details

### Die businessDate Funktion
```typescript
export function getBusinessDate(referenceDate?: Date): Date {
  const now = referenceDate || new Date();
  const hour = now.getHours();
  
  // Vor 3 Uhr nachts = noch der vorherige Geschäftstag
  if (hour < 3) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  return now;
}
```

### Betroffene Stellen im Code
| Datei | Aktuelle Logik | Neue Logik |
|-------|---------------|------------|
| WaiterMobile.tsx | `const today = new Date()` | `const today = getBusinessDate()` |
| ManagerDashboard.tsx | `useState(new Date())` | `useState(getBusinessDate())` |
| WaiterCashUp.tsx | `useState(new Date())` | `useState(getBusinessDate())` |
| DateSelector.tsx | `new Date()` in goToToday | `getBusinessDate()` |
