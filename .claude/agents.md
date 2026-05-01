# Agenten-System — Garten Dienstplan

> Lies diese Datei am Anfang jeder Session, um dich schnell zu orientieren.
> Vollständige Projektstruktur: `CLAUDE.md` (Root).

---

## Wie du diese Datei nutzt

1. Lies `CLAUDE.md` für Projektkontext und Struktur
2. Identifiziere welche Agenten-Rolle(n) für die Aufgabe gefragt sind
3. Lade das passende Agenten-Profil aus `.claude/agents/`
4. Folge der passenden Skill-Pipeline aus `.claude/skills/`
5. Wende die relevanten Regeln aus `.claude/rules/` an

**Bei Token-Limit:** Fülle `.claude/transfer.md` aus bevor du aufhörst.

---

## Das Agenten-Team

### Implementer
**Rolle:** Schreibt und ändert TypeScript/React/SQL Code nach den Projektregeln.
**Profil:** `.claude/agents/implementer.md`
**Wann:** Bei jeder Code-Änderung. Ist der Standard-Agent.
**Schnittstellen:** Empfängt Spezifikation vom Reviewer, liefert Code an Security + Tester.

### Frontend-Agent
**Rolle:** Prüft und implementiert UI-Komponenten, Tailwind-Styling, Responsive Design.
**Profil:** `.claude/agents/frontend.md`
**Wann:** Bei neuen UI-Komponenten, Designänderungen, Accessibility-Problemen.
**Schnittstellen:** Arbeitet nach Reviewer-Spezifikation, übergibt an Implementer für Logik.

### Security-Agent
**Rolle:** Findet Sicherheitslücken in Code, Datenbankregeln und API-Grenzen.
**Profil:** `.claude/agents/security.md`
**Wann:** Vor jedem Commit mit DB-Änderungen, neuen Server Actions, Auth-Flows.
**Schnittstellen:** Prüft Implementer-Output, meldet Befunde zurück.

### Performance-Agent
**Rolle:** Optimiert DB-Queries, Next.js-Caching, Bundle-Größe, Server-Component-Splits.
**Profil:** `.claude/agents/performance.md`
**Wann:** Wenn Seiten langsam laden, N+1-Queries vermutet werden, neue Datenbankabfragen.
**Schnittstellen:** Prüft Implementer-Output, schlägt Optimierungen vor.

### Reviewer-Agent
**Rolle:** Prüft Feature-Spezifikationen auf Vollständigkeit, Edge Cases, UX-Flow.
**Profil:** `.claude/agents/reviewer.md`
**Wann:** Vor der Implementierung (Was fehlt?), nach der Implementierung (Was ist unklar?).
**Schnittstellen:** Gibt Spec an Implementer + Frontend-Agent.

### Tester-Agent
**Rolle:** Schreibt Tests, prüft manuelle Test-Checklisten, identifiziert Abdeckungslücken.
**Profil:** `.claude/agents/tester.md`
**Wann:** Nach jeder Implementierung, bevor Git-Commit.
**Schnittstellen:** Prüft Implementer-Output, meldet fehlende Tests.

### Documentor-Agent
**Rolle:** Hält `docs/`, `CLAUDE.md`, Migrations-Kommentare und `README` aktuell.
**Profil:** `.claude/agents/documentor.md`
**Wann:** Nach Feature-Abschluss, nach DB-Migrationen, nach Architekturänderungen.
**Schnittstellen:** Letzter Schritt in jeder Pipeline vor dem finalen Commit.

---

## Standard-Pipelines

### Neue Feature
```
1. Reviewer     → Spezifikation prüfen, Edge Cases definieren
2. Implementer  → Code schreiben (Server Action + Query + Component)
3. Frontend     → UI prüfen (Responsive, Farben, Accessibility)
4. Security     → RLS, Auth, Input-Validierung prüfen
5. Performance  → Queries und Caching prüfen
6. Tester       → Tests schreiben + manuelle Checkliste abarbeiten
7. Documentor   → docs/ aktualisieren
8. Git-Commit   → nach bestandenen Tests
```
Details: `.claude/skills/new-feature.md`

### Bug Fix
```
1. Diagnose     → Fehlerursache verstehen (Logs, Code, DB)
2. Implementer  → Fix schreiben (minimaler Scope)
3. Security     → Kein neues Sicherheitsproblem eingeführt?
4. Tester       → Regression-Test für den Fix
5. Documentor   → Ggf. bekannte Probleme in docs/ aktualisieren
6. Git-Commit   → nach bestandenen Tests
```
Details: `.claude/skills/bugfix.md`

### Refactoring
```
1. Reviewer     → Scope definieren (was wird geändert, was nicht)
2. Implementer  → Refactoring durchführen
3. Tester       → Alle bestehenden Tests noch grün?
4. Git-Commit   → nach bestandenen Tests
```
Details: `.claude/skills/refactor.md`

---

## Parallelarbeit

Wenn mehrere unabhängige Aufgaben vorliegen:
- **Parallel starten:** Security-Review und Performance-Review können gleichzeitig laufen
- **Sequenziell:** Implementer muss fertig sein bevor Security prüft
- **Immer zuletzt:** Documentor und Git-Commit

---

## Qualitätsgates

Vor jedem Git-Commit müssen bestanden sein:
- [ ] `npm run typecheck` — kein TypeScript-Fehler
- [ ] `npm run build` — Build erfolgreich
- [ ] Security-Checkliste (`.claude/agents/security.md`)
- [ ] Manuelle Test-Checkliste (`.claude/agents/tester.md`)
- [ ] Dokumentation aktuell (`.claude/agents/documentor.md`)
