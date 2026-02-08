
## Admin-Login nur über QR-Code

### Änderung
Für Benutzer mit `permissionLevel === 'admin'` wird der Lock Screen so angepasst, dass:
- **Keine PIN-Eingabe** mehr angezeigt wird
- **QR-Code automatisch generiert** wird beim Laden des Lock Screens
- Nur der "Anderer Benutzer" Button bleibt als Alternative

### Betroffene Datei

| Datei | Änderung |
|-------|----------|
| `src/components/auth/SessionLockScreen.tsx` | Unterschiedliche UI für Admin vs. Staff |

### Technische Umsetzung

1. **Admin-Erkennung**: Prüfung auf `user?.permissionLevel === 'admin'`

2. **Automatischer QR-Code für Admin**: 
   - `useEffect` der bei Admin-Login sofort `handleGenerateQr()` aufruft
   - Zeigt direkt den QR-Code ohne zusätzlichen Button-Klick

3. **Unterschiedliche UI-Darstellung**:
   - **Staff**: PIN-Eingabe + "Entsperren" Button + "Anderer Benutzer"
   - **Admin**: QR-Code-Anzeige + "Anderer Benutzer" (kein PIN-Feld)

4. **Admin Lock Screen Layout**:
   ```
   ┌─────────────────────────────┐
   │      🔒 Session gesperrt    │
   │   Angemeldet als [Admin]    │
   │                             │
   │   Scanne den QR-Code mit    │
   │   deinem Handy zum          │
   │   Entsperren                │
   │                             │
   │      ┌─────────────┐        │
   │      │   QR-CODE   │        │
   │      │             │        │
   │      └─────────────┘        │
   │                             │
   │   ⏳ Warte auf Bestätigung  │
   │                             │
   │   [🚪 Anderer Benutzer]     │
   └─────────────────────────────┘
   ```

### Ablauf für Admin
1. Lock Screen erscheint nach Inaktivität
2. QR-Code wird **automatisch** generiert und angezeigt
3. Admin scannt mit Handy → Bestätigt
4. Session wird entsperrt

### Ablauf für Staff (unverändert)
1. Lock Screen erscheint nach Inaktivität
2. PIN-Eingabe
3. Session wird entsperrt
