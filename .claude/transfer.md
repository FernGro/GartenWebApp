# Token-Übergabe-Protokoll

> Fülle diese Datei aus, bevor die Tokens ausgehen.
> Der nächste Agent liest diese Datei als ERSTE Aktion (noch vor CLAUDE.md).
> Datum und aktiven Zweig immer aktualisieren.

---

## Übergabe-Template

Kopiere den Block unten, fülle ihn aus und ersetze den vorherigen Übergabe-Block.

```markdown
## Aktive Übergabe

**Datum:** [YYYY-MM-DD HH:MM]
**Git-Branch:** main
**Letzter Commit:** [Hash] [Commit-Message]
**Aktiver Agent:** [Implementer | Frontend | Security | Performance | Reviewer | Tester | Documentor]

### Aufgabe
[Was wird gerade implementiert / gefixt / refactored?]
[User Story oder Fehlerbeschreibung in 2–3 Sätzen]

### Erledigte Schritte
- [x] Schritt 1
- [x] Schritt 2
- [ ] Schritt 3 (angefangen, noch nicht fertig)

### Aktueller Zustand
[Welche Datei ist gerade offen / wird bearbeitet?]
[Welche Entscheidung wurde zuletzt getroffen?]
[Wo genau in der Pipeline sind wir?]

### Offene Punkte (nächster Agent muss das tun)
1. [Konkrete Aktion 1]
2. [Konkrete Aktion 2]
3. ...

### Wichtige Entscheidungen dieser Session
- [Entscheidung A: warum wurde sie so getroffen]
- [Entscheidung B: was wurde bewusst NICHT gemacht]

### Geänderte Dateien
- `src/...` — [was wurde geändert]
- `supabase/migrations/...` — [noch nicht in Supabase angewendet?]

### Bekannte Risiken / Fallstricke
- [Was könnte schief gehen?]
- [Welche Abhängigkeiten gibt es?]

### Kontext für sofortigen Einstieg
[Ein Satz: was der nächste Agent als ERSTES tun soll]
```

---

## Checkliste vor der Übergabe

Bevor du aufhörst, stelle sicher:

- [ ] Kein halbfertiger Code ohne Kommentar (`// TODO: weiter hier`)
- [ ] TypeScript kompiliert (`npm run typecheck`)
- [ ] Wenn Datenbankänderung: Migration-Datei angelegt und im Übergabe-Template vermerkt
- [ ] Oben stehender Template-Block ausgefüllt
- [ ] Git-Status beschrieben (was ist committed, was nicht)

---

## Aufnahme-Protokoll für den neuen Agent

1. Diese Datei lesen
2. `CLAUDE.md` für Projektkontext lesen
3. Geänderte Dateien anschauen (`git diff HEAD` oder listed im Template)
4. Mit dem ersten offenen Punkt aus "Offene Punkte" beginnen
5. Am Ende der Session: dieses Template wieder aktualisieren

---

## Letzte Übergabe

**Datum:** 2026-05-02
**Git-Branch:** main
**Letzter Commit:** 38ac390 added leave garden and delete garden feature
**Aktiver Agent:** —

### Aufgabe
Einrichtung des `.claude/` KI-Frameworks (CLAUDE.md, Agenten, Regeln, Skills).

### Erledigte Schritte
- [x] Migration 006 (leave_garden, delete_garden, Trigger-Bugfix)
- [x] TypeScript-Typen für neue RPCs
- [x] Server Actions leaveGardenAction, deleteGardenAction
- [x] UI: Gefahrenzone in GardenSettingsPanel
- [x] Deployment-Doku für Migration 006 aktualisiert
- [x] .claude/-Verzeichnisstruktur anlegen
- [ ] CLAUDE.md + alle .claude/-Dateien fertigstellen (läuft gerade)

### Aktueller Zustand
.claude/-Struktur wird angelegt. Noch nicht alle Dateien geschrieben.

### Offene Punkte
1. Alle rules/*.md fertigstellen
2. Alle agents/*.md fertigstellen
3. Alle skills/*.md fertigstellen
4. Migration 006 auf Supabase anwenden (noch ausständig)
5. Owner-Restore-Fehler abklären: Vercel Logs prüfen, ob Funktion fehlt

### Bekannte Risiken
- Migration 006 ist lokal aber NICHT in Supabase angewendet → neue Buttons schlagen fehl bis die Migration läuft
- Application error Digest 3643413348: Ursache unklar, wahrscheinlich fehlende Migration 004 in Supabase
