# Skill: Refactoring

## Wann nutzen?
- Wenn duplizierter Code in mehrere Dateien extrahiert werden soll
- Wenn eine Datei zu groß wird und aufgeteilt werden soll
- Wenn ein Pattern vereinheitlicht werden soll
- NICHT: wenn gleichzeitig neue Features hinzukommen (eigene Pipeline nutzen)

---

## Goldene Regel

**Refactoring ändert NICHTS am Verhalten. Nur die Struktur ändert sich.**

Wenn sich während des Refactorings eine Bug-Möglichkeit zeigt: separater Bugfix-Commit.
Wenn sich eine Feature-Idee zeigt: Backlog, nicht jetzt.

---

## Pipeline

### Phase 1 — Scope definieren (Reviewer-Agent)

**Aufgaben:**
1. Was genau wird geändert?
2. Was bleibt unverändert?
3. Welche Tests (manuell) prüfen ob das Verhalten gleich geblieben ist?

**Output:** Klare Grenze: "Refactor X → Y. Z bleibt unverändert."

**Checkpoint:** Scope klar und begrenzt → Phase 2

---

### Phase 2 — Refactoring durchführen (Implementer-Agent)

**Prinzip:** Ein Schritt nach dem anderen. Nicht alles auf einmal.

**Empfohlene Reihenfolge:**
1. Ziel-Abstraktion anlegen (neues File, neue Funktion)
2. Alte Implementierung auf neue Abstraktion umschreiben
3. Sicherstellen dass Typen korrekt sind
4. Alte Code-Stellen migrieren
5. Alte (jetzt ungenutzte) Code entfernen

**Beispiel: readString-Helper extrahieren**
```
1. lib/form-helpers.ts anlegen mit readString
2. Eine Datei auf lib/form-helpers.ts umschreiben + testen
3. Nächste Datei umschreiben + testen
4. Alle Dateien migriert → fertig
```

**Checkliste:**
- [ ] Kein `any` eingeführt
- [ ] Typen korrekt übertragen
- [ ] Keine versteckten Behavior-Änderungen
- [ ] TypeScript sauber

**Checkpoint:** TypeScript sauber → Phase 3

---

### Phase 3 — Testing (Tester-Agent)

**Fokus: Regression. Hat sich etwas am Verhalten geändert?**

1. `npm run typecheck` — muss sauber sein
2. `npm run build` — muss erfolgreich sein
3. Manuelle Tests für alle betroffenen Features

**Besonders prüfen:**
- Importpfade korrekt?
- Exports vorhanden wo nötig?
- Kein Feature durch Umbenennung kaputt?

**Checkpoint:** Alles identisch wie vorher → Phase 4

---

### Phase 4 — Dokumentation aktualisieren (optional, Documentor-Agent)

Nur wenn:
- Neue Datei angelegt → `CLAUDE.md` Verzeichnisstruktur aktualisieren
- Pattern dokumentiert war → docs/ aktualisieren

---

### Phase 5 — Git-Commit

```bash
npm run typecheck && npm run build
git add <dateien>
git commit -m "refactor <was wurde vereinheitlicht>"
git push origin main
```

---

## Bekannte Refactoring-Kandidaten (Backlog)

### Niedriger Impact (nice-to-have)

1. **`readString` Helper** — Ist in mehreren action-Dateien dupliziert.
   Extraktion nach `lib/form-helpers.ts`.
   Risiko: Niedrig. Impact: Niedrig.

2. **`activeOwnerCount` Helper** — Ähnliche Logik in `member-actions.ts`.
   Könnte in `lib/gardens/queries.ts` extrahiert werden.
   Risiko: Niedrig. Impact: Niedrig.

### Höherer Impact (mit Bedacht)

3. **Dashboard-Doppel-Abfrage** — `getGardenMembers` wird zweimal aufgerufen
   (active + all). Könnte zu einer Abfrage + JS-Filter konsolidiert werden.
   Risiko: Mittel (Behavior-Change möglich). Impact: Minimal (kleines Dataset).

---

## Was KEIN gutes Refactoring ist

- Umbenennen von Variablen ohne Grund
- Abstraktion einführen weil "es könnte mal nützlich sein"
- Klassen statt Funktionen ohne konkreten Nutzen
- Performanceoptimierung unter dem Deckmantel von Refactoring
