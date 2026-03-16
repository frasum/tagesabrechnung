

## Einmalige Übernahme der Skill-Zuweisungen aus thaitime.pro

### Situation
Die `sync-employees`-Schnittstelle in thaitime.pro liefert aktuell **keine Skills** mit. Sie gibt nur Stammdaten (Name, Perso-Nr, Stundenlohn etc.) zurück. Die `employee_skills`-Tabelle wird dort nicht abgefragt.

### Notwendige Schritte (zwei Projekte betroffen)

**Schritt 1 — Im Projekt [thaitime.pro](/projects/5a39cb5f-34aa-4dce-bae4-b0934de226e8):**
Die `sync-employees` Edge Function erweitern, damit sie zusätzlich zu den Mitarbeiterdaten auch deren Skill-Zuweisungen mitliefert. Das Response-Format wird um ein `skills`-Array pro Mitarbeiter ergänzt:

```json
{
  "perso_nr": 352,
  "name": "MO",
  "skills": ["Vorspeise", "pass", "kochen"]
}
```

**Schritt 2 — Zurück in diesem Projekt (Tagesabrechnung):**
Eine einmalige Sync-Funktion (Edge Function oder Button im UI) erstellen, die:
1. Die erweiterte thaitime-API aufruft
2. Mitarbeiter per `perso_nr` matcht
3. Die Skill-Namen mappt (thaitime → Tagesabrechnung):

```text
thaitime          →  Tagesabrechnung
─────────────────────────────────────
Vorspeise         →  VS
pass              →  PASS
spülen            →  SPÜLEN
kochen            →  CO
service / Service →  SERVICE
Bar               →  BAR
GL                →  GL
```

4. Die gemappten Skills in die `employee_skills`-Tabelle einfügt

### Empfohlenes Vorgehen
Da ich von hier aus das thaitime.pro-Projekt nicht ändern kann, müsstest du kurz **in das thaitime.pro-Projekt wechseln** und mich dort bitten, die `sync-employees`-Funktion um Skills zu erweitern. Danach können wir hier den Import durchführen.

