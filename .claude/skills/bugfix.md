# Skill: Bug fixen

## Wann nutzen?
- Wenn ein bekannter Fehler gemeldet wird
- Wenn ein Application-Error (Vercel-Log) untersucht wird
- Wenn eine Funktion nicht wie erwartet funktioniert
- Wenn ein Datenbankproblem identifiziert wurde

---

## Pipeline

### Phase 1 — Diagnose

**Input:** Fehlerbeschreibung, Fehlermeldung, Digest-Code, oder beobachtetes Fehlverhalten

**Aufgaben:**
1. **Symptome sammeln:**
   - Fehlermeldung (Vercel Logs → Project → Functions)
   - Reproduce-Schritte
   - Betroffene Seite / Aktion
   
2. **Ursache eingrenzen:**
   ```
   Application error beim Laden → Server Component wirft Exception
   Application error nach Form-Submit → Server Action wirft Exception
   Daten falsch → Query-Fehler oder Logik-Fehler
   Keine Daten → RLS blockiert oder Query-Filter falsch
   Funktion existiert nicht → Migration nicht angewendet
   ```

3. **Code lesen:**
   - Betroffene Datei(en) identifizieren
   - Kontext verstehen (welche Daten kommen rein, was wird erwartet)
   
4. **Hypothese formulieren:** "Das Problem ist wahrscheinlich X, weil Y."

**Checkpoint:** Ursache verstanden → Phase 2
Wenn Ursache unklar: Vercel-Logs und Supabase-Logs prüfen, dann nochmal.

---

### Phase 2 — Fix schreiben (Implementer-Agent)

**Prinzip: Minimaler Scope.**
Nur das fixen was kaputt ist. Nicht nebenbei refactoren.

**Aufgaben:**
1. Fix schreiben
2. Sicherstellen dass der Fix die identifizierte Ursache adressiert
3. Sicherstellen dass kein neues Problem eingeführt wird

**Für häufige Bug-Typen:**

**Trigger-Bug (return new in DELETE-Pfad):**
```sql
-- FALSCH: return new = null in DELETE-Trigger → löscht nicht
if some_condition then
  return new;  -- BUG für DELETE
end if;

-- RICHTIG: je nach tg_op unterschiedlich returnen
if some_condition then
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end if;
```

**Fehlende Migration:**
```bash
# Im Supabase SQL Editor ausführen:
select proname from pg_proc where proname = 'function_name';
# Wenn leer → Migration fehlt → in Supabase SQL Editor nachholen
```

**RLS blockiert Abfrage:**
```sql
-- Prüfen ob Policy existiert
select policyname, cmd, qual from pg_policies 
where tablename = 'table_name';
```

**TypeScript-Fehler nach Supabase-Update:**
```typescript
// types/database.ts Functions-Block aktualisieren
```

**Checkpoint:** Fix geschrieben, TypeScript sauber → Phase 3

---

### Phase 3 — Security-Check (Security-Agent)

**Kurz-Prüfung:** Löst der Fix ein Sicherheitsproblem oder führt er ein neues ein?

- [ ] Fix behebt kein Auth-Bypass versehentlich?
- [ ] Keine neuen unkontrollierten Inputs?
- [ ] Trigger-Fix: Verhält sich korrekt für alle tg_op Werte?

**Checkpoint:** Sicher → Phase 4

---

### Phase 4 — Testing (Tester-Agent)

**Spezifisch für Bugfixes:**

1. **Regression-Test:** Den gemeldeten Bug nachbauen und testen ob er behoben ist.
2. **Positive Tests:** Normales Verhalten noch korrekt?
3. **Edge-Cases:** Benachbarte Szenarien getestet?

```bash
npm run typecheck
npm run build
```

**Checkpoint:** Build sauber + Bug reproduzierbar behoben → Phase 5

---

### Phase 5 — Dokumentation (Documentor-Agent, optional)

Nur wenn:
- Workaround in `docs/` dokumentiert war → Hinweis entfernen
- Bekanntes Problem in deployment guide erwähnt → Hinweis entfernen/aktualisieren
- Architekturentscheidung hat sich geändert

---

### Phase 6 — Git-Commit

```bash
npm run typecheck && npm run build
git add <betroffene-dateien>
git commit -m "fix <beschreibung des bugs>"
git push origin main
```

**Migrations-Fixes:** Wenn die Datenbank geändert wird → sofort in Supabase SQL Editor ausführen, dann pushen.

---

## Diagnose-Hilfen

### Vercel Logs lesen

```
Vercel Dashboard → Projekt → Logs → Functions
Filter: Fehlerzeitpunkt
Suche nach: Error, Exception, throw
```

### Supabase Fehler verstehen

| Fehlermuster | Ursache |
|---|---|
| `function "name" does not exist` | Migration nicht angewendet |
| `new row violates row-level security` | RLS Policy fehlt oder blockiert |
| `A garden must keep at least one active owner` | Trigger-Schutz greift (korrekt!) |
| `Only the garden creator can restore owner role` | User ist nicht der Ersteller |
| `Not authenticated` | auth.uid() = null, Session abgelaufen |
| `duplicate key value violates unique constraint` | UPSERT Pattern prüfen |

### TypeScript Fehler verstehen

```
Argument of type '"function_name"' is not assignable...
→ types/database.ts Functions-Block ergänzen

Property '...' does not exist on type...
→ Domänentyp in types/domain.ts ergänzen
```

---

## Abbruch-Kriterien

- Wenn die Ursache nach 3 Diagnose-Iterationen unklar ist → User nach Logs fragen
- Wenn der Fix größer als der ursprüngliche Scope wird → Separate Feature-Pipeline nutzen
