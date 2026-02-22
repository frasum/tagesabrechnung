

# Biometrischer Login (Face ID / Touch ID) via WebAuthn

## Überblick
Mitarbeiter können nach einer einmaligen Registrierung ihren biometrischen Sensor (Face ID, Touch ID, Fingerprint) nutzen, um sich schnell einzuloggen -- ohne PIN-Eingabe.

## Nutzer-Ablauf

1. **Registrierung (einmalig):** Nach dem normalen Login erscheint ein Button "Face ID aktivieren". Das Gerät wird mit dem Mitarbeiter-Konto verknüpft.
2. **Login:** Auf der Login-Seite erscheint ein neuer Button "Mit Face ID anmelden". Ein Tap startet die biometrische Prüfung, und der Nutzer ist eingeloggt.
3. **Verwaltung:** In den Einstellungen kann die biometrische Verknüpfung gelöscht werden.

## Technische Umsetzung

### 1. Neue Datenbank-Tabelle: `webauthn_credentials`

Speichert die registrierten biometrischen Credentials pro Mitarbeiter/Gerät:

- `id` (UUID, Primary Key)
- `staff_id` (UUID, FK zu staff)
- `credential_id` (TEXT, unique) -- Base64-kodierte WebAuthn Credential ID
- `public_key` (TEXT) -- Base64-kodierter Public Key
- `counter` (BIGINT) -- Replay-Schutz
- `device_name` (TEXT, optional) -- z.B. "iPhone von Max"
- `created_at` (TIMESTAMPTZ)

RLS: Nur über Edge Functions zugreifbar (kein direkter Client-Zugriff).

### 2. Zwei neue Edge Functions

**`webauthn-register`** -- Registrierung eines neuen Credentials
- Erwartet: Auth-Token + Challenge-Response vom Browser
- Validiert die WebAuthn-Attestation serverseitig
- Speichert Credential in der Datenbank

**`webauthn-authenticate`** -- Login via Biometrie
- Erwartet: Credential ID + signierte Challenge
- Verifiziert die Signatur gegen den gespeicherten Public Key
- Gibt bei Erfolg einen Auth-Token / Session zurück

### 3. Frontend-Änderungen

**Login-Seite (`src/pages/Login.tsx`):**
- Neuer Button "Mit Face ID anmelden" (nur sichtbar, wenn das Gerät WebAuthn unterstützt UND ein Credential registriert ist)
- Prüfung via `navigator.credentials.get()` mit `publicKey`-Option

**Neuer Hook: `src/hooks/useWebAuthn.ts`**
- `isSupported` -- prüft ob der Browser WebAuthn unterstützt
- `hasCredential` -- prüft ob für dieses Gerät ein Credential in localStorage hinterlegt ist
- `register()` -- startet den Registrierungsprozess
- `authenticate()` -- startet den Login-Prozess

**Registrierungs-UI:**
- Nach erfolgreichem Login: optionaler Dialog/Banner "Möchten Sie Face ID für schnellen Login aktivieren?"
- Oder: Button in den Einstellungen / im Profil-Bereich

### 4. Challenge-Handling

Challenges werden serverseitig generiert und temporär gespeichert (z.B. in einer `webauthn_challenges`-Tabelle mit kurzer TTL), um Replay-Angriffe zu verhindern.

### 5. Kompatibilität

- **iPhone (Safari):** Face ID / Touch ID
- **Android (Chrome):** Fingerprint / Face Unlock
- **Mac (Safari/Chrome):** Touch ID
- **Windows (Edge/Chrome):** Windows Hello
- Geräte ohne biometrische Sensoren sehen den Button nicht

## Einschränkungen

- WebAuthn-Credentials sind gerätegebunden -- jedes Gerät muss einzeln registriert werden
- Erfordert HTTPS (in der PWA bereits gegeben)
- Die serverseitige Krypto-Verifikation in Edge Functions nutzt die Web Crypto API (in Deno verfügbar)

