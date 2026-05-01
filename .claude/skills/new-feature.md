# Skill: Neues Feature implementieren

## Wann nutzen?
- Wenn ein neues Feature oder eine neue Seite hinzukommt
- Wenn eine bestehende Funktion signifikant erweitert wird
- Wenn eine neue Datenbankfunktion (RPC) oder Tabelle benötigt wird

---

## Pipeline

### Phase 1 — Spezifikation (Reviewer-Agent)

**Input:** Benutzeranforderung in natürlicher Sprache

**Aufgaben:**
1. Anforderung in technische Spezifikation übersetzen
2. Edge Cases identifizieren (letzter Owner, kein Garten, kein User, ...)
3. Datenbankänderungen identifizieren (neue Tabellen? neue RPC?)
4. Betroffene Seiten identifizieren (wo wird es angezeigt? was braucht revalidatePath?)
5. Autorisierung klären (Owner / Admin / Member / alle)

**Output:** Technische Spezifikation mit:
- Was die Funktion tut
- Wer sie nutzen darf
- Edge Cases und ihre Behandlung
- Zu ändernde/neue Dateien

**Checkpoint:** Spezifikation vollständig → Phase 2

---

### Phase 2 — Datenbankänderungen (Implementer-Agent)

**Nur wenn neue Tabellen, Spalten oder RPCs nötig**

**Aufgaben:**
1. Neue Migration anlegen (`XXX_beschreibung.sql`)
2. Migrations-Vorlage aus `.claude/rules/03-database.md` nutzen
3. `types/database.ts` aktualisieren (neue Functions, Tables)
4. TypeScript-Fehler prüfen: `npm run typecheck`

**Checkpoint:** TypeScript sauber + Migration angelegt → Phase 3

---

### Phase 3 — Business-Logik (Implementer-Agent)

**Aufgaben:**
1. Query-Funktion anlegen oder erweitern (in `lib/*/queries.ts`)
2. Server Action anlegen oder erweitern (in `lib/*/actions.ts`)
3. Pattern aus `.claude/agents/implementer.md` nutzen

**Checkliste:**
- [ ] `requireUser()` erste Zeile der Server Action
- [ ] Fehler geworfen (nicht geschluckt)
- [ ] `revalidatePath()` für alle betroffenen Seiten
- [ ] Neue RPC: `supabase.rpc("function_name", {...})`

**Checkpoint:** TypeScript sauber → Phase 4

---

### Phase 4 — UI-Komponenten (Implementer + Frontend-Agent)

**Aufgaben:**
1. Server Component für die Seite (wenn neue Seite nötig)
2. UI-Komponente(n) anlegen oder erweitern
3. Design-System aus `.claude/agents/frontend.md` nutzen
4. `export const dynamic = "force-dynamic"` auf neuen Seiten

**Checkliste:**
- [ ] Nur Farben aus Design-System
- [ ] Mobile-first (funktioniert auf 375px)
- [ ] Leerzustand mit `<EmptyState>` abgedeckt
- [ ] Fehlerzustand kommuniziert

**Checkpoint:** Build erfolgreich → Phase 5

---

### Phase 5 — Security-Review (Security-Agent)

**Aufgaben:**
Checkliste aus `.claude/agents/security.md` vollständig durchgehen.

**Kritische Punkte:**
- [ ] `requireUser()` vorhanden?
- [ ] SQL-Funktionen prüfen Berechtigungen?
- [ ] Kein Admin-Client für User-Operationen?
- [ ] RLS auf neuen Tabellen?

**Checkpoint:** Keine kritischen Funde → Phase 6
Wenn kritische Funde: zurück zu Phase 2/3/4

---

### Phase 6 — Performance-Review (Performance-Agent)

**Aufgaben:**
- [ ] N+1-Problem in neuen Queries?
- [ ] `Promise.all()` für parallele Abfragen?
- [ ] Unnötige Spalten in `select()`?
- [ ] Index für neue Filter nötig?

**Checkpoint:** Keine kritischen Performance-Probleme → Phase 7

---

### Phase 7 — Testing (Tester-Agent)

**Aufgaben:**
1. `npm run typecheck` — muss sauber sein
2. `npm run build` — muss erfolgreich sein
3. Feature-spezifische manuelle Tests aus `.claude/rules/06-testing.md`
4. Regressionstest für benachbarte Features
5. Edge Cases manuell testen

**Checkpoint:** Alle Tests bestanden → Phase 8

---

### Phase 8 — Dokumentation (Documentor-Agent)

**Aufgaben:**
1. Wenn neue Migration: `docs/beginner-deployment.md` aktualisieren
2. Wenn neue RPC: `CLAUDE.md` aktualisieren (RPC-Liste)
3. Wenn Architekturänderung: `docs/architecture.md` aktualisieren
4. `.claude/transfer.md` auf aktuellen Stand bringen

**Checkpoint:** Dokumentation vollständig → Phase 9

---

### Phase 9 — Git-Commit

```bash
npm run typecheck   # muss sauber sein
npm run build       # muss erfolgreich sein
git status          # prüfen was committed wird
git add <dateien>   # spezifisch, kein -A ohne Prüfung
git commit -m "add <feature-name>"
git push origin main
```

**Nach dem Push:** Migration in Supabase SQL Editor ausführen (falls neue Migration).

---

## Abbruch-Kriterien

An jedem Checkpoint kann die Pipeline gestoppt werden wenn:
- Spezifikation unklar oder widersprüchlich → zurück zum User
- Sicherheitsproblem entdeckt → zuerst lösen, dann weiter
- Build-Fehler → sofort beheben, kein "wird schon passen"
- Test fehlgeschlagen → sofort beheben

---

## Schnell-Referenz (Dateien die fast immer betroffen sind)

| Feature-Typ | Dateien |
|---|---|
| Neue Mitglieder-Funktion | `member-actions.ts`, `settings/members/page.tsx`, `invite-panel.tsx` |
| Neue Garten-Funktion | `settings-actions.ts`, `settings/garden/page.tsx`, `garden-settings-panel.tsx` |
| Neue Aufgaben-Funktion | `tasks/actions.ts`, `tasks/queries.ts`, `tasks/[id]/page.tsx` |
| Neue DB-Funktion | `migrations/00N_*.sql`, `types/database.ts` |
| Neue Seite | `app/.../page.tsx`, `AppShell` Nav-Item |
